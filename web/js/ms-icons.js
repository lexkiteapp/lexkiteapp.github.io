/* Icon Material Symbols vẽ bằng SVG (P0 15/11): trên iPhone Safari ligature của phông icon không ra hình → ô trống. SVG giống nhau ở mọi engine.
   Phần tử .material-symbols-(rounded|outlined) giữ nguyên chữ tên icon (mã khác đọc/đổi textContent như cũ); ở đây chữ bị giấu (CSS [data-ms]) và thêm <svg> phủ lên.
   Đường vẽ nằm ở js/ms-paths.js (sinh từ chính phông: scripts/build-ms-icons.py), nạp LƯỜI khi gặp icon đầu tiên – màn không có icon (Hôm nay) không tải gì.
   Chưa nạp xong / thiếu icon / lỗi mạng → để nguyên phông (dự phòng). Cổng: scripts/test/ms-icons.mjs, scripts/test/icon-blank.mjs (WebKit + Chromium). */
(function () {
  var SEL = '.material-symbols-rounded,.material-symbols-outlined', P = window.MSP, st = 0, q = 0;
  function one(el) {
    var f = el.firstChild, t = f && f.nodeType === 3 ? f.nodeValue.trim() : '', s = el.lastChild, own = s && s.nodeType === 1 && s.tagName === 'svg' && s.classList.contains('msv');
    if (own && (!t || t === el.getAttribute('data-ms'))) return;
    if (own) el.removeChild(s);
    if (!t) { el.removeAttribute('data-ms'); return; }
    var fam = el.classList.contains('material-symbols-rounded') ? 'r' : 'o', fill = el.classList.contains('fill'), d = (fill && P[fam + 'f'] && P[fam + 'f'][t]) || (P[fam] && P[fam][t]);
    if (!d) { el.removeAttribute('data-ms'); return; }
    el.setAttribute('data-ms', t);
    el.insertAdjacentHTML('beforeend', '<svg class="msv" viewBox="0 -960 960 960" aria-hidden="true" focusable="false"><path d="' + d + '"/></svg>');
  }
  function all(root) { if (!P) return; if (root.matches && root.matches(SEL)) one(root); var l = root.querySelectorAll ? root.querySelectorAll(SEL) : [], i = 0; for (; i < l.length; i++) one(l[i]); }
  function load() {
    if (P || st) return; st = 1;
    var s = document.createElement('script'); s.src = 'js/ms-paths.js';
    s.onload = function () { P = window.MSP; if (P) all(document); }; s.onerror = function () { st = 0; q = 1; };
    document.head.appendChild(s);
  }
  function run(muts) {
    for (var i = 0; i < muts.length; i++) {
      var m = muts[i], t = m.target, el;
      if (m.type === 'childList' && m.addedNodes.length) for (var j = 0; j < m.addedNodes.length; j++) { var n = m.addedNodes[j]; if (n.nodeType === 1) { if (P) all(n); else if ((n.matches && n.matches(SEL)) || n.querySelector(SEL)) load(); } }
      el = t && (t.nodeType === 1 ? t : t.parentElement); el = el && el.closest && el.closest(SEL);
      if (el) { if (P) one(el); else load(); }
    }
  }
  function start() {
    if (!window.MutationObserver) return;
    new MutationObserver(run).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    if (document.querySelector(SEL)) { if (P) all(document); else load(); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
