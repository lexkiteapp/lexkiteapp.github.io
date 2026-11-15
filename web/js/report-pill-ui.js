/* ⚑ Báo lỗi – phần LƯỜI của nút (js/report-pill.js nạp sau DOMContentLoaded): ẩn khi cuộn xuống/gõ phím, chân thanh bên gọn "⋯ Xem thêm",
 * hỏi trạng thái phiếu đã gửi (≤ 1 lần/12 giờ, hoặc ngay sau báo đẩy "đã sửa"). Kiểu: css/style.css § report-pill. docs/REPORTS.md */
(function (w, d) {
  var p = w.LexPill; if (!p || p.ui) return; p.ui = 1;
  var b = p.b, load = w.LexReportLoad;
  // Chân thanh bên GỌN (05/11, chủ: như Linear/Notion): 1 hàng hồ sơ (#sideLevel: avatar + tên + chip cấp, vạch XP mảnh) + nút "⋯" ở cuối hàng
  // mở menu: Tôi · Cài đặt | Blog · Giới thiệu · Từ vựng · Bài mẫu · Liên hệ · pháp lý | Báo lỗi. Không bỏ link nào (no-cuts).
  // A11y: <details>/<summary> (Enter/Space, aria-expanded gốc), mũi tên ↑↓/Home/End giữa mục, Esc đóng + trả focus về ⋯, Tab ra ngoài → đóng.
  // style.css (§ side-menu) giữ sẵn ô ⋯ trong hàng hồ sơ → không xô bố cục (CLS 0). Lỗi tải file này → report-pill.js thêm .sf-ok → hiện lại chân cũ.
  var f = d.querySelector('.side-foot');
  if (f && !f.querySelector('.sf-more')) {
    var dt = d.createElement('details'), T = function (k, en) { return w.t ? t(k) : en; }, L = T('Xem thêm', 'More'); dt.className = 'sf-more';
    dt.innerHTML = '<summary aria-haspopup="true" aria-label="' + L + '" title="' + L + '" data-i18n-title="Xem thêm"><span class="ic"><svg class="i" aria-hidden="true"><use href="#i-ellipsis"/></svg></span><span class="sf-l" data-i18n="Xem thêm">' + L + '</span></summary><div class="sf-m"></div>';
    var m = dt.lastChild, ic = function (i) { return '<span class="ic"><svg class="i" aria-hidden="true"><use href="#i-' + i + '"/></svg></span>'; };
    m.innerHTML = '<a href="#/me">' + ic('user') + '<bdi data-i18n="Tôi">' + T('Tôi', 'Me') + '</bdi></a><a href="#/settings">' + ic('settings') + '<bdi data-i18n="Cài đặt">' + T('Cài đặt', 'Settings') + '</bdi></a><hr>';
    [].slice.call(f.querySelectorAll(':scope>a')).forEach(function (a) { m.appendChild(a); }); // Blog, Từ vựng, Bài mẫu, Liên hệ, pháp lý, Giới thiệu (hubs.js vẫn bắt click .side-foot a[data-l])
    var ab = m.querySelector('a[data-l=about]'), bl = m.querySelector('a[data-blog]'); if (ab && bl) m.insertBefore(ab, bl.nextSibling); // Blog · Giới thiệu đứng đầu nhóm
    m.appendChild(d.createElement('hr'));
    f.insertBefore(dt, f.firstChild); f.classList.add('sf-ok', 'sp-on');
    var sl = d.getElementById('sideLevel'); if (sl && sl.parentNode === f.parentNode) { var row = d.createElement('div'); row.className = 'sp-row'; sl.parentNode.insertBefore(row, sl); row.appendChild(sl); row.appendChild(f); } // hàng hồ sơ = #sideLevel + ⋯ (ô ⋯ đã chừa sẵn bằng padding)
    var rep = function () { if (b.parentNode === f) m.appendChild(b); }; rep(); p.inMenu = m; // nút Báo lỗi vào cuối menu (report-pill.js place() giữ nguyên chỗ nếu đã ở trong f)
    var items = function () { return [].slice.call(m.querySelectorAll('a,button')).filter(function (x) { return !x.hidden && !x.disabled; }); };
    var close = function (fx) { if (!dt.open) return; dt.open = false; if (fx) dt.firstChild.focus(); };
    dt.addEventListener('toggle', function () { if (dt.open) { var it = items()[0]; if (it && d.activeElement === dt.firstChild && dt._kb) it.focus(); } dt._kb = 0; });
    dt.firstChild.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') dt._kb = 1; if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); dt._kb = 1; if (!dt.open) dt.open = true; else { var it = items(); (e.key === 'ArrowUp' ? it[it.length - 1] : it[0]).focus(); } } });
    m.addEventListener('keydown', function (e) { var it = items(), i = it.indexOf(d.activeElement), n = it.length; if (!n) return;
      var j = e.key === 'ArrowDown' ? (i + 1) % n : e.key === 'ArrowUp' ? (i - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1; if (j >= 0) { e.preventDefault(); it[j].focus(); } });
    m.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('a,button')) setTimeout(function () { close(); }, 0); }); // chọn mục → đóng
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
