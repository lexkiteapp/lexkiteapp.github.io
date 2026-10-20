/* Nút đổi ngôn ngữ (menu button WAI-ARIA) dùng chung app + trang tĩnh – mô tả: scripts/lib/site-layout.mjs (langSwitch) */
(function (w, d) {
  function init(r) {
    var b = r.querySelector('[aria-haspopup]'), m = r.querySelector('[role=menu]');
    if (r.lsw || !b || !m) return; r.lsw = 1;
    var all = function () { return [].slice.call(m.querySelectorAll('[role^=menuitem]')); };
    var go = function (a, i) { if (a[i]) a[i].focus(); };
    var close = function (f) { if (m.hidden) return; m.hidden = true; b.setAttribute('aria-expanded', 'false'); if (f) b.focus(); };
    var open = function (last) {
      var a = all(), i = 0, q;
      m.hidden = false; b.setAttribute('aria-expanded', 'true');
      m.classList.remove('lsw-s'); q = m.getBoundingClientRect(); if (q.left < 0 || q.right > d.documentElement.clientWidth) m.classList.add('lsw-s'); // tràn màn hình → căn mép kia
      a.forEach(function (x, k) { if (x.getAttribute('aria-current') || x.getAttribute('aria-checked') == 'true') i = k; });
      go(a, last ? a.length - 1 : i);
    };
    b.onclick = function () { if (m.hidden) open(); else close(); };
    b.onkeydown = function (e) { if (/^Arrow(Up|Down)$/.test(e.key)) { e.preventDefault(); open(e.key == 'ArrowUp'); } };
    m.onkeydown = function (e) {
      var a = all(), n = a.length, i = a.indexOf(d.activeElement), k = e.key, j;
      if (k == 'Escape') { e.preventDefault(); close(1); } else if (k == 'Tab') close();
      else if (/^(Arrow(Up|Down)|Home|End)$/.test(k)) { e.preventDefault(); go(a, k == 'Home' ? 0 : k == 'End' ? n - 1 : (i + (k == 'ArrowDown' ? 1 : n - 1)) % n); }
      else if (k == ' ' && a[i] && a[i].href) { e.preventDefault(); a[i].click(); }
      else if (k.length == 1 && !e.ctrlKey && !e.metaKey && !e.altKey) for (j = 1; j <= n; j++) if (!a[(i + j) % n].textContent.toLowerCase().indexOf(k.toLowerCase())) { go(a, (i + j) % n); break; }
    };
    m.onclick = function (e) {
      var a = e.target.closest('[role^=menuitem]'); if (!a) return;
      try { localStorage.setItem('vb.uiLang', a.lang); } catch (x) { /* chế độ riêng tư */ }
      close(1);
    };
    d.addEventListener('click', function (e) { if (!r.contains(e.target)) close(); });
    r.addEventListener('focusout', function (e) { if (e.relatedTarget && !r.contains(e.relatedTarget)) close(); });
  }
  var run = function () { [].forEach.call(d.querySelectorAll('[data-lsw]'), init); };
  w.LkLangMenu = init;
  if (d.readyState == 'loading') d.addEventListener('DOMContentLoaded', run); else run();
})(window, document);
