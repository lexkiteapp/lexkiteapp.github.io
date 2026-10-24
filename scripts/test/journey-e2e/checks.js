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
  W.LKJC = { layers, audit, vis: e => !!vis(e) };
})(window);
