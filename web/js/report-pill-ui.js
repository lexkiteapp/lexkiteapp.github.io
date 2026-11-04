/* ⚑ Báo lỗi – phần LƯỜI của nút (js/report-pill.js nạp sau DOMContentLoaded): ẩn khi cuộn xuống/gõ phím, chân thanh bên gọn "⋯ Xem thêm",
 * hỏi trạng thái phiếu đã gửi (≤ 1 lần/12 giờ, hoặc ngay sau báo đẩy "đã sửa"). Kiểu: css/style.css § report-pill. docs/REPORTS.md */
(function (w, d) {
  var p = w.LexPill; if (!p || p.ui) return; p.ui = 1;
  var b = p.b, load = w.LexReportLoad;
  // Chân thanh bên: giữ Blog + Giới thiệu, link phụ (từ vựng, bài mẫu, liên hệ, pháp lý) vào popover "⋯ Xem thêm" (<details>: Enter/Space, Esc đóng + trả focus).
  // style.css đã ẩn sẵn link phụ + chừa 1 hàng 44 px cho nút ⋯ cho tới khi có .sf-ok → không xô bố cục.
  var f = d.querySelector('.side-foot');
  if (f && !f.querySelector('.sf-more')) {
    var dt = d.createElement('details'), L = w.t ? t('Xem thêm') : 'More'; dt.className = 'sf-more';
    dt.innerHTML = '<summary aria-haspopup="true"><span aria-hidden="true">⋯</span> <span data-i18n="Xem thêm">' + L + '</span></summary><div class="sf-m"></div>';
    var m = dt.lastChild;
    [].slice.call(f.querySelectorAll(':scope>a')).forEach(function (a) { if (!a.hasAttribute('data-blog') && a.getAttribute('data-l') !== 'about') m.appendChild(a); });
    f.insertBefore(dt, b.parentNode === f ? b : null); f.classList.add('sf-ok');
    var close = function (fx) { if (!dt.open) return; dt.open = false; if (fx) dt.firstChild.focus(); };
    dt.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); close(true); } });
    d.addEventListener('click', function (e) { if (!dt.contains(e.target)) close(); });
    dt.addEventListener('focusout', function (e) { if (e.relatedTarget && !dt.contains(e.relatedTarget)) close(); });
    // Hộp thoại (hỏi nhắc học, xác nhận…) mở → đóng popover, không để 2 lớp nổi chồng nhau (journey-e2e)
    var mo = d.getElementById('modal'); if (mo && w.MutationObserver) new MutationObserver(function () { if (!mo.hidden) close(); }).observe(mo, { attributes: true, attributeFilter: ['hidden'] });
  } else if (f) f.classList.add('sf-ok');
  // Cuộn xuống → ẩn (nhường chỗ đọc), cuộn lên/về đầu trang → hiện lại; đổi trang → mốc cuộn mới
  var off = false, lastY = w.scrollY || 0;
  var setOff = function (v) { if (v !== off) { off = v; b.classList.toggle('off', v); } };
  w.addEventListener('hashchange', function () { off = false; (w.requestAnimationFrame || setTimeout)(function () { lastY = w.scrollY || 0; }); });
  w.addEventListener('scroll', function () { var y = w.scrollY || 0, dy = y - lastY; if (Math.abs(dy) < 8) return; setOff(dy > 0 && y > 80); lastY = y; }, { passive: true });
  b.addEventListener('focus', function () { setOff(false); }); // phím Tab tới nút → luôn hiện
  // Đang gõ (bàn phím ảo che nửa màn hình) → ẩn, không đè ô nhập
  var typing = function (el) { return !!(el && el !== b && el.matches && el.matches('input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]),textarea,select,[contenteditable=""],[contenteditable=true]')); };
  d.addEventListener('focusin', function (e) { b.classList.toggle('kb', typing(e.target)); });
  d.addEventListener('focusout', function () { setTimeout(function () { b.classList.toggle('kb', typing(d.activeElement)); }, 0); });
  b.classList.toggle('kb', typing(d.activeElement));
  // Đã từng gửi báo lỗi → lúc rảnh (≤ 1 lần/12 giờ) hỏi trạng thái mới để nhắc trong app; vừa có báo đẩy "đã sửa" (sw.js đặt chk) → hỏi ngay
  var poll = function (ms) { setTimeout(function () { load().then(function (R) { R.poll(); }, function () {}); }, ms); };
  try {
    if (localStorage.getItem('lk.rp') && Date.now() - (+localStorage.getItem('lk.rpc') || 0) > 432e5) poll(9000);
    else if (localStorage.getItem('lk.rp') && w.caches) caches.open('lk-meta').then(function (c) { return c.match('/__rep'); }).then(function (r) { return r && r.json(); }).then(function (x) { if (x && x.chk) poll(1500); }, function () {});
  } catch (x) { /* bỏ qua */ }
})(window, document);
