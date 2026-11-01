/* journey-e2e – đầu dò TRONG trang (dùng chung: Playwright web, iOS harness, Android CDP). Không phụ thuộc thư viện.
 * window.LKJC.layers() → các lớp nổi đang hiện (hộp thoại, toast, popover "Xem thêm", lời mời nhắc học…)
 * window.LKJC.audit(tag) → [{t, msg}] lỗi: lớp nổi chồng nhau, 2 lời mời cùng lúc, focus sai (hộp thoại mở mà focus ở ngoài), ô quảng cáo, chữ Việt rò rỉ. */
(function (W) {
  'use strict';
  const D = document;
  const vis = e => { if (!e) return null; const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return null; const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || +cs.opacity < 0.05) return null; return r; };
  // Lớp nổi: [tên, selector] – mọi thứ đè lên nội dung trang
  const LAYERS = [
    ['modal', '#modal:not([hidden]) #modalBox'], ['dialog', 'dialog[open]'], ['toast', '#toast.show'], ['more-popover', 'details.sf-more[open] .sf-m'],
    ['acct-pop', '.acct-pop'], ['install-nudge', '.install-nudge'], ['sheet', '.sheet'], ['lang-menu', '.lang-menu:not([hidden])'],
  ];
  // Lời mời bật nhắc học (mọi biến thể): hộp hỏi mềm (remind.js #raY) + dải mời trong màn thưởng (path-reward.js #prRem)
  const PROMPTS = [['soft-ask', '#raY'], ['reward-nudge', '#prRem']];
  function layers() {
    const out = [];
    for (const [n, s] of LAYERS) for (const e of D.querySelectorAll(s)) { const r = vis(e); if (r) out.push({ n, r: { x: r.left, y: r.top, w: r.width, h: r.height } }); }
    return out;
  }
  const hit = (a, b) => a.x < b.x + b.w - 1 && b.x < a.x + a.w - 1 && a.y < b.y + b.h - 1 && b.y < a.y + a.h - 1;
  function audit(tag) {
    const bad = [], L = layers(), add = (t, msg) => bad.push({ t, msg: (tag ? '[' + tag + '] ' : '') + msg });
    for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) if (hit(L[i].r, L[j].r)) add('overlap', `lớp nổi chồng nhau: ${L[i].n} × ${L[j].n}`);
    const nm = L.filter(x => x.n === 'modal' || x.n === 'dialog').length; if (nm > 1) add('overlap', nm + ' hộp thoại mở cùng lúc');
    const pr = PROMPTS.filter(([, s]) => vis(D.querySelector(s))).map(x => x[0]); if (pr.length > 1) add('double-prompt', 'hai lời mời nhắc học cùng lúc: ' + pr.join(' + '));
    const mb = D.querySelector('#modal:not([hidden]) #modalBox');
    if (mb && vis(mb)) { const a = D.activeElement; if (!a || !mb.contains(a)) add('focus', 'hộp thoại đang mở nhưng focus ở ngoài: ' + (a ? a.tagName.toLowerCase() + (a.id ? '#' + a.id : '') : 'null')); }
    if (L.some(x => x.n === 'more-popover') && L.some(x => x.n === 'modal')) add('overlap', 'popover "Xem thêm" vẫn mở khi hộp thoại hiện');
    const ads = [...D.querySelectorAll('.ad-slot,[data-ad],ins.adsbygoogle,iframe[src*="googlesyndication"],iframe[src*="doubleclick"]')].length; if (ads) add('ads', ads + ' ô quảng cáo trong DOM khi cờ quảng cáo TẮT');
    return bad;
  }
  // ---- Kiểm hình tự động (0 token) – chạy ở mỗi bước chụp ảnh trên điện thoại 360/390 (docs/METHODS.md) ----
  // fail: (a) lớp nổi cố định (toast, banner, lời mời…) đè lên nút bấm được · (b) tràn ngang · (d) dòng số liệu toàn 0 ("0 … · 0 …")
  // warn: (c) chữ bị cắt không có ellipsis chủ ý · (f) nút chính < 44 px. (e) ảnh đơn sắc: tính ở phía Node (journey-e2e.mjs) từ ảnh chụp.
  const sel = e => { if (!e || !e.tagName) return '?'; let s = e.tagName.toLowerCase(); if (e.id) return s + '#' + e.id; const c = [...e.classList].slice(0, 2).join('.'); if (c) s += '.' + c; const p = e.parentElement; return (p && p !== D.body ? (p.id ? '#' + p.id : p.tagName.toLowerCase() + (p.classList[0] ? '.' + p.classList[0] : '')) + ' > ' : '') + s; };
  const txt = e => (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  const CHROME = '#modal, .modal, .bottom-nav, .topbar, .app-head, header, .skip-link, .xp-float, .cele-still, .lfx-cb, canvas';
  const inVp = r => r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
  const area = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  function visual(tag) {
    const fail = [], warn = [], pre = (tag ? '[' + tag + '] ' : '') + location.hash.split('?')[0] + ' ';
    const mb = D.querySelector('#modal:not([hidden]) #modalBox'), modalOn = !!(mb && vis(mb));
    // (a) lớp nổi cố định đè nút
    const floats = [];
    for (const e of D.body.querySelectorAll('*')) {
      const cs = getComputedStyle(e); if (cs.position !== 'fixed') continue;
      if (e.closest(CHROME) && !e.matches('#toast')) continue;
      if (cs.pointerEvents === 'none' && !e.matches('#toast')) continue;
      if (e.matches('#toast') && !e.classList.contains('show')) continue;
      if (modalOn && !(+cs.zIndex > 50)) continue; // nằm dưới hộp thoại → không thấy
      const r = vis(e); if (r && inVp(r)) floats.push([e, r]);
    }
    const root = modalOn ? mb : D;
    const targets = [...root.querySelectorAll('button:not([disabled]), a.btn, a.chip, [role="button"], input[type="submit"], .option')]
      .map(e => [e, vis(e)]).filter(([e, r]) => r && inVp(r) && !floats.some(([f]) => f.contains(e) || e.contains(f)) && (modalOn || !e.closest('#modal')));
    for (const [f, fr] of floats) for (const [t, tr] of targets) if (area(fr, tr) > 0) fail.push(`(a) ${pre}${sel(f)} «${txt(f)}» đè nút ${sel(t)} «${txt(t)}»`);
    // (b) tràn ngang
    const de = D.documentElement;
    if (de.scrollWidth > de.clientWidth + 1) {
      const wide = [...D.body.querySelectorAll('*')].filter(e => { const r = e.getBoundingClientRect(); return r.width && r.right > de.clientWidth + 1 && getComputedStyle(e).position !== 'fixed'; }).filter((e, i, a) => !a.some(x => x !== e && x.contains(e) === false && e.contains(x))).slice(0, 3);
      fail.push(`(b) ${pre}tràn ngang ${de.scrollWidth} > ${de.clientWidth}: ${wide.map(sel).join(', ')}`);
    }
    // (c) chữ bị cắt · (d) số liệu toàn 0 · (f) nút chính < 44 px
    const scope = modalOn ? [mb] : [D.querySelector('#view'), D.querySelector('.bottom-nav')].filter(Boolean);
    for (const sc of scope) for (const e of sc.querySelectorAll('*')) {
      if (!e.childNodes.length || ![...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) continue;
      const r = vis(e); if (!r || !inVp(r)) continue;
      const cs = getComputedStyle(e), t = txt(e);
      const clipX = e.scrollWidth > e.clientWidth + 1 && /hidden|clip/.test(cs.overflowX) && cs.textOverflow !== 'ellipsis';
      const clipY = e.scrollHeight > e.clientHeight + 2 && /hidden|clip/.test(cs.overflowY) && !(cs.webkitLineClamp && cs.webkitLineClamp !== 'none');
      if (clipX || clipY) warn.push(`(c) ${pre}chữ bị cắt ${clipX ? 'ngang' : 'dọc'} ${sel(e)} «${t}»`);
      const full = (e.textContent || '').replace(/\s+/g, ' ').trim();
      if (full.length < 120 && /·/.test(full) && /(^|\D)0(?![\d.,])/.test(full) && !/[1-9]/.test(full) && full.split('·').filter(x => /\d/.test(x)).length >= 2) fail.push(`(d) ${pre}dòng số liệu toàn 0 ${sel(e)} «${t}»`);
    }
    for (const e of root.querySelectorAll('.btn.primary, button.primary')) { const r = vis(e); if (r && inVp(r) && (r.height < 44 || r.width < 44)) warn.push(`(f) ${pre}nút chính ${Math.round(r.width)}×${Math.round(r.height)} < 44 px ${sel(e)} «${txt(e)}»`); }
    return { fail: [...new Set(fail)], warn: [...new Set(warn)] };
  }
  W.LKJC = { layers, audit, visual, vis: e => !!vis(e) };
})(window);
