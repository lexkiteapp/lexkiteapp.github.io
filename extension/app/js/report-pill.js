/* ⚑ Nút "Báo lỗi" nổi (góc dưới trái, tránh thanh điều hướng & tai thỏ) + bộ đệm 20 lỗi console gần nhất.
 * Siêu nhẹ: form, gửi, trang trạng thái nằm ở js/report.js – chỉ tải khi bấm (hoặc khi mở #/report/<mã>).
 * Không nằm trong SHELL của sw.js (báo lỗi cần mạng → không cần tải sẵn cho offline). Không sửa app.js: tự đăng ký route 'report'.
 * Ẩn khi đang luyện/thi có giờ (không gây xao nhãng) và ở màn chào mừng. Tài liệu: docs/REPORTS.md */
(function (w, d) {
  var E = w.__lkErrs = [];
  var push = function (m) { m = String(m || '').slice(0, 300); if (m && !/ResizeObserver loop|^Script error/.test(m)) { E.push(m); if (E.length > 20) E.shift(); } };
  w.addEventListener('error', function (e) { if (e.message) push(e.message + (e.filename ? ' @' + e.filename.split('/').pop() + ':' + e.lineno : '')); }, true);
  w.addEventListener('unhandledrejection', function (e) { var r = e.reason; push('promise: ' + (r && (r.message || r))); });
  var ce = console.error; console.error = function () { try { push([].map.call(arguments, function (a) { return a && a.message || String(a); }).join(' ')); } catch (x) { /* bỏ qua */ } return ce.apply(console, arguments); };
  var P;
  var load = w.LexReportLoad = function () { return P || (P = new Promise(function (y, n) { var s = d.createElement('script'); s.src = 'js/report.js'; s.onload = function () { y(w.LexReport); }; s.onerror = function () { P = 0; s.remove(); n(); }; d.head.appendChild(s); })); };
  if (w.App && App.routes) App.routes.report = function (a, q) { return load().then(function (R) { return R.page(a, q); }); };
  var HIDE = /^#\/(practice\/|review|mock|toeic-test|toeic-r|toeic-sw|listen-test|toefl-p|dictation|rtype|call|handsfree|reflex|welcome|report)/;
  d.addEventListener('DOMContentLoaded', function () {
    var st = d.createElement('style');
    st.textContent = '.lk-rep{position:fixed;left:calc(10px + env(safe-area-inset-left));bottom:calc(12px + env(safe-area-inset-bottom));z-index:30;font:600 .72rem/1 var(--font,system-ui);padding:.45rem .7rem;min-height:30px;border-radius:999px;border:1px solid var(--line,#ccc);background:var(--surface,#fff);color:var(--muted,#555);box-shadow:var(--shadow-sm,none);cursor:pointer}.lk-rep:hover,.lk-rep:focus-visible{color:var(--text,#111)}@media(min-width:901px){.lk-rep{left:calc(var(--sidebar,0px) + 12px)}}@media(max-width:900px){.lk-rep{bottom:calc(70px + env(safe-area-inset-bottom))}}body.bare .lk-rep,.lk-rep[hidden]{display:none}@media print{.lk-rep{display:none}}';
    d.head.appendChild(st);
    var b = d.createElement('button');
    b.type = 'button'; b.className = 'lk-rep'; b.id = 'lkRep'; b.innerHTML = '<span aria-hidden="true">⚑</span> <span data-i18n="Báo lỗi">' + (w.t ? t('Báo lỗi') : 'Report') + '</span>'; // data-i18n: từ điển nạp sau vẫn dịch lại
    b.onclick = function () { b.disabled = true; load().then(function (R) { R.open(); }, function () {}).then(function () { b.disabled = false; }); };
    var sync = function () { b.hidden = HIDE.test(location.hash); };
    w.addEventListener('hashchange', sync); sync(); d.body.appendChild(b);
    // Đã từng gửi báo lỗi → lúc rảnh (≤ 1 lần/12 giờ) hỏi trạng thái mới để nhắc trong app
    try { if (localStorage.getItem('lk.rp') && Date.now() - (+localStorage.getItem('lk.rpc') || 0) > 432e5) setTimeout(function () { load().then(function (R) { R.poll(); }, function () {}); }, 9000); } catch (x) { /* bỏ qua */ }
  });
})(window, document);
