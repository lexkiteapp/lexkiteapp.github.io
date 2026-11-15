//build-ms-icons.py
(function () {
  var SEL = '.material-symbols-rounded,.material-symbols-outlined', P = window.MSP, st = 0, A = [].forEach;
  function one(el) {
    var f = el.firstChild, t = f && f.nodeType == 3 ? f.nodeValue.trim() : '', s = el.lastChild, c = el.classList, k = c.contains('material-symbols-rounded') ? 'r' : 'o', d;
    if (s && s.tagName == 'svg' && s.classList.contains('msv')) { if (!t || t == el.getAttribute('data-ms')) return; el.removeChild(s); }
    d = t && ((c.contains('fill') && P[k + 'f'] && P[k + 'f'][t]) || (P[k] && P[k][t]));
    if (!d) return el.removeAttribute('data-ms');
    el.setAttribute('data-ms', t);
    el.insertAdjacentHTML('beforeend', '<svg class="msv" viewBox="0 -960 960 960" aria-hidden="true"><path d="' + d + '"/></svg>');
  }
  function all(r) { if (P) { if (r.matches && r.matches(SEL)) one(r); A.call(r.querySelectorAll(SEL), one); } }
  function need(n) { if (P) all(n); else if (!st && (n.matches(SEL) || n.querySelector(SEL))) {
    st = 1; var s = document.createElement('script'); s.src = 'fonts/ms-paths.js';
    s.onload = function () { P = window.MSP; all(document.documentElement); }; s.onerror = function () { st = 0; };
    document.head.appendChild(s);
  } }
  function start() {
    if (!window.MutationObserver) return;
    new MutationObserver(function (ms) {
      ms.forEach(function (m) {
        A.call(m.addedNodes, function (n) { if (n.nodeType == 1) need(n); });
        var t = m.target, el = t.nodeType == 1 ? t : t.parentElement; el = el && el.closest(SEL);
        if (el) need(el);
      });
    }).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    need(document.documentElement);
  }
  if (document.readyState == 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
