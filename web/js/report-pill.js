/* ⚑ Báo lỗi – LÕI < 3 KB (size-guard): 20 lỗi console + nút + route. CSS: style.css § report-pill. Lười: report-pill-ui.js, report.js. docs/REPORTS.md */
(function (w, d) {
  var E = w.__lkErrs = [], P;
  var push = function (m) { m = String(m || '').slice(0, 300); if (m && !/ResizeObserver loop|^Script error/.test(m)) { E.push(m); if (E.length > 20) E.shift(); } };
  w.addEventListener('error', function (e) { if (e.message) push(e.message + (e.filename ? ' @' + e.filename.split('/').pop() + ':' + e.lineno : '')); }, true);
  w.addEventListener('unhandledrejection', function (e) { var r = e.reason; push('promise: ' + (r && (r.message || r))); });
  var ce = console.error; console.error = function () { try { push([].map.call(arguments, function (a) { return a && a.message || String(a); }).join(' ')); } catch (x) { /* bỏ qua */ } return ce.apply(console, arguments); };
  var js = function (f, y, n) { var s = d.createElement('script'); s.src = 'js/' + f; s.onload = y; s.onerror = function () { s.remove(); n(); }; d.head.appendChild(s); };
  var load = w.LexReportLoad = function () { return P || (P = new Promise(function (y, n) { js('report.js', function () { y(w.LexReport); }, function () { P = 0; n(); }); })); };
  if (w.App && App.routes) App.routes.report = function (a, q) { return load().then(function (R) { return R.page(a, q); }); };
  var HIDE = /^#\/(practice\/|review|mock|toeic-test|toeic-r|toeic-sw|listen-test|toefl-p|dictation|rtype|call|handsfree|reflex|welcome|report)/;
  d.addEventListener('DOMContentLoaded', function () {
    var b = d.createElement('button'), L = w.t ? t('Báo lỗi') : 'Report', html = d.documentElement, wide = w.matchMedia ? w.matchMedia('(min-width: 901px)') : null;
    b.type = 'button'; b.className = 'lk-rep'; b.id = 'lkRep'; b.title = L; b.setAttribute('data-i18n-title', 'Báo lỗi');
    b.innerHTML = '<span class="ic"><svg class="i" aria-hidden="true"><use href="#i-flag"/></svg></span><span class="lk-rep-l" data-i18n="Báo lỗi">' + L + '</span>';
    b.onclick = function () { b.disabled = true; load().then(function (R) { R.open(); }, function () {}).then(function () { b.disabled = false; }); };
    var place = function () { // rộng: chân thanh bên
      var f = d.querySelector('.side-foot'), side = !!(wide && wide.matches && f);
      b.classList.toggle('in-side', side);
      if (side) { if (!f.contains(b)) ((w.LexPill || 0).inMenu || f).appendChild(b); } else if (b.parentNode !== d.body) d.body.appendChild(b);
      html.classList.toggle('lk-fab', !side && !b.hidden);
    };
    var sync = function () { b.hidden = HIDE.test(location.hash); b.classList.remove('off'); place(); };
    w.addEventListener('hashchange', sync);
    if (wide && wide.addEventListener) wide.addEventListener('change', place);
    sync(); w.LexPill = { b: b, place: place };
    js('report-pill-ui.js', function () {}, function () { var f = d.querySelector('.side-foot'); if (f) f.classList.add('sf-ok'); }); // lỗi tải: hiện lại link phụ
  });
})(window, document);
