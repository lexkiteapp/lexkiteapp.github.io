/* journey-matrix – đầu dò trong trang (bổ sung LKJC của journey-e2e/checks.js, không lặp lại): tab đang chọn, vùng chạm, giao diện sáng/tối, cuối trang bị thanh tab che,
 * chữ Việt/thiếu dịch ở ngôn ngữ khác vi, khung chờ. Không phụ thuộc thư viện. */
(function (W) {
  'use strict';
  const D = document;
  const vis = e => { if (!e) return null; const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return null; const c = getComputedStyle(e); return c.visibility === 'hidden' || c.display === 'none' || +c.opacity < 0.05 ? null : r; };
  const inVp = r => r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
  const txt = e => (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  const name = e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : e.classList[0] ? '.' + e.classList[0] : '');
  const tabs = () => {
    const row = e => ({ k: e.dataset.tab || e.dataset.route, cur: e.getAttribute('aria-current') === 'page', h: Math.round(e.getBoundingClientRect().height), w: Math.round(e.getBoundingClientRect().width) });
    const bn = D.querySelector('#bnav a[aria-current="page"]');
    return { bar: [...D.querySelectorAll('a[data-tab]')].filter(vis).map(row), side: [...D.querySelectorAll('#nav a[data-route]')].filter(vis).map(row), domCur: bn ? bn.dataset.tab : '', focus: D.body.classList.contains('focus') };
  };
  // Nút chính + tab + nút thoát phải ≥ 44 px (checks.js chỉ cảnh báo .btn.primary)
  const TAP = '.btn.primary, button.primary, .lsn-start, .ux1-go, [data-cont], a[data-tab], #nav a[data-route], [data-exit]';
  const taps = () => [...D.querySelectorAll(TAP)].map(e => e.matches('a, button') ? e : e.closest('a, button') || e).map(e => [e, vis(e)]).filter(([, r]) => r && inVp(r) && (r.height < 43.5 || r.width < 43.5)).map(([e, r]) => `${name(e)} «${txt(e)}» ${Math.round(r.width)}×${Math.round(r.height)}`);
  const lum = c => { const m = /rgba?\(([\d.]+), ?([\d.]+), ?([\d.]+)(?:, ?([\d.]+))?/.exec(c || ''); if (!m || m[4] === '0') return null; const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(+m[1]) + 0.7152 * f(+m[2]) + 0.0722 * f(+m[3]); };
  const theme = () => ({ body: lum(getComputedStyle(D.body).backgroundColor), html: lum(getComputedStyle(D.documentElement).backgroundColor), attr: D.documentElement.getAttribute('data-theme') || '' });
  // Cuối trang: phần tử bấm được cuối cùng của #view không được nằm dưới thanh tab cố định
  async function reach() {
    const nav = [...D.querySelectorAll('nav')].find(n => { const r = vis(n); return r && getComputedStyle(n).position === 'fixed' && r.bottom >= innerHeight - 2 && n.querySelector('a[data-tab]'); });
    const v = D.querySelector('#view'); if (!nav || !v) return null;
    const y0 = scrollY; scrollTo(0, D.documentElement.scrollHeight); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const atEnd = scrollY + innerHeight >= D.documentElement.scrollHeight - 2, top = nav.getBoundingClientRect().top;
    const last = [...v.querySelectorAll('a[href], button:not([disabled]), [data-href]')].filter(e => !nav.contains(e) && !e.closest('nav') && vis(e) && getComputedStyle(e).position !== 'fixed').pop();
    const bad = atEnd && last && last.getBoundingClientRect().bottom > top + 1 && last.getBoundingClientRect().top < innerHeight ? `${name(last)} «${txt(last)}» đáy ${Math.round(last.getBoundingClientRect().bottom)} > thanh tab ${Math.round(top)}` : null;
    scrollTo(0, y0); return bad;
  }
  // Chữ Việt rò rỉ + thiếu dịch (chữ tiếng Anh của một khoá mà ngôn ngữ này không có bản dịch trùng) + biến chưa thay {n}
  const VI = /[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
  const BRAND = /^(IELTS|TOEIC|TOEFL|Lexkite|CEFR|XP|Band\b|Radio$|[A-C][12]$)/;
  function leak(lang) {
    const out = [], seen = new Set(), add = (k, s) => { if (!seen.has(k + s)) { seen.add(k + s); out.push(`${k} «${s.slice(0, 50)}»`); } };
    const en = (W.I18N_DICT && W.I18N_DICT.en) || {}, inv = new Map(); for (const [k, v] of Object.entries(en)) { if (typeof v === 'string') (inv.get(v) || inv.set(v, []).get(v)).push(k); }
    const roots = [...D.querySelectorAll('#view, #bnav, #nav, #ux1Rail, .topbar')].filter(vis);
    const check = s => {
      s = s.replace(/\s+/g, ' ').trim(); if (s.length < 2) return;
      if (/\{[a-z]+\}/i.test(s)) add('biến chưa thay', s);
      if (lang === 'vi') return;
      if (VI.test(s)) add('chữ Việt', s);
      if (lang === 'en' || !/[a-z]{2}/i.test(s) || BRAND.test(s)) return;
      const ks = inv.get(s);
      if (ks && !ks.some(k => W.I18N && I18N.tr(lang, k) === s)) add('thiếu dịch', s);
    };
    for (const r of roots) {
      const tw = D.createTreeWalker(r, NodeFilter.SHOW_TEXT);
      for (let n = tw.nextNode(); n; n = tw.nextNode()) { const p = n.parentElement; if (!p || p.closest('script,style,.material-symbols-outlined,[translate="no"],[lang="en"]') || !vis(p)) continue; check(n.textContent); }
      for (const e of r.querySelectorAll('[aria-label],[title],[placeholder]')) { if (e.closest('[translate="no"],[lang="en"]') || !vis(e)) continue; for (const a of ['aria-label', 'title', 'placeholder']) if (e.hasAttribute(a)) check(e.getAttribute(a)); }
    }
    return out.slice(0, 12);
  }
  // Ghi lại khung chờ / màn trống theo thời gian (route trễ)
  const S = W.__lkjm = { skel: 0, emptyMs: 0, t: 0, netToast: '' };
  const tick = () => {
    const v = D.querySelector('#view'); if (!v) return;
    if (v.querySelector('.skel-page, .skel-study, .skel, [aria-busy="true"]')) S.skel++;
    const tt = D.querySelector('#toast.show'); if (tt && /📴/.test(tt.textContent || '')) S.netToast = txt(tt);
  };
  try { setInterval(tick, 60); } catch (e) { /* bỏ qua */ }
  // Màn hiện chữ trên màn: có gì đó ngoài trang trắng
  const painted = () => { const v = D.querySelector('#view'), b = (D.body && D.body.innerText) || ''; return { body: b.trim().length, view: v ? v.children.length : 0, viewText: v ? v.innerText.trim().length : 0, err: !!(v && v.querySelector('.err-state')) }; };
  // Phông icon phải nạp được: không thì màn hiện chữ "menu_book" thay vì biểu tượng
  async function iconFont() { const e = [...D.querySelectorAll('.material-symbols-outlined')].find(vis); if (!e || !D.fonts) return null; const fam = getComputedStyle(e).fontFamily.split(',')[0]; await Promise.race([D.fonts.ready.then(() => D.fonts.load('24px ' + fam, 'home')).catch(() => {}), new Promise(r => setTimeout(r, 6000))]); /* phông icon nạp lười khi chữ cần vẽ (font-display:block): ép nạp rồi mới kiểm, như stitch-diff – chậm ≠ không nạp được */ return D.fonts.check('24px ' + fam, 'home') ? null : fam; }
  W.LKJM = { iconFont, vis: e => !!vis(e), tabs, taps, theme, reach, leak, painted, state: S };
})(window);
