/* ⚑ Nút "Báo lỗi" (điện thoại: nút tròn trên thanh điều hướng, ẩn khi cuộn xuống; máy tính: chân thanh bên) + bộ đệm 20 lỗi console gần nhất.
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
  // Không che nội dung: điện thoại = nút tròn 44 px trên thanh điều hướng (ẩn khi cuộn xuống, hiện khi cuộn lên), .view chừa đáy --fab-space;
  // máy tính = mục trong chân thanh bên (không nổi trên nội dung). Ẩn khi gõ phím, khi có hộp thoại/thanh hành động dính đáy/bảng kết quả.
  var CSS = '.lk-rep{position:fixed;left:calc(12px + env(safe-area-inset-left));bottom:calc(68px + env(safe-area-inset-bottom));z-index:30;display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;padding:0;border-radius:50%;border:1px solid var(--line,#ccc);background:var(--surface,#fff);color:var(--muted,#555);box-shadow:var(--shadow,0 2px 10px rgba(0,0,0,.15));font:600 1.05rem/1 var(--font,system-ui);cursor:pointer;transition:transform .22s ease,opacity .22s ease}'
    + '.lk-rep:hover,.lk-rep:focus-visible{color:var(--text,#111)}.lk-rep:focus-visible{outline:2px solid var(--primary,#0F3D3E);outline-offset:2px}'
    + '.lk-rep-l{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}'
    + '.lk-rep.off{transform:translateY(140%);opacity:0;pointer-events:none}'
    + '[dir=rtl] .lk-rep:not(.in-side){left:auto;right:calc(12px + env(safe-area-inset-right))}'
    + 'html.has-banner .lk-rep{bottom:calc(132px + env(safe-area-inset-bottom))}'
    + '.lk-rep.in-side{position:static;width:auto;height:auto;min-height:24px;padding:0;border:0;border-radius:4px;background:none;box-shadow:none;font:inherit;gap:.25rem;color:var(--muted,#555);transform:none;opacity:1;pointer-events:auto}'
    + '.lk-rep.in-side{width:28px;height:28px;min-height:28px;justify-content:center;border-radius:50%;margin-inline-start:auto}.lk-rep.in-side:hover{background:var(--accent-soft,#eee)}'
    // Chân thanh bên gọn (docs/UX-PUBLIC.md): 1 dòng chữ nhỏ Blog · Giới thiệu · ⋯ Xem thêm (popover) · ⚑ (nút biểu tượng + chú thích)
    + '.side-foot{flex-wrap:nowrap;align-items:center;gap:.25rem .8rem;font-size:13px;line-height:1.3;position:relative}.side-foot>a{white-space:nowrap}'
    + '.sf-more>summary{list-style:none;cursor:pointer;color:var(--muted);white-space:nowrap;border-radius:6px;padding:2px 4px}.sf-more>summary::-webkit-details-marker{display:none}.sf-more>summary:hover,.sf-more[open]>summary{color:var(--text)}.sf-more>summary:focus-visible{outline:2px solid var(--primary,#0F3D3E);outline-offset:2px}'
    + '.sf-m{position:absolute;left:0;bottom:calc(100% + 8px);z-index:40;display:flex;flex-direction:column;min-width:210px;padding:6px;background:var(--surface,#fff);border:1px solid var(--line,#ddd);border-radius:12px;box-shadow:0 12px 30px rgba(20,20,60,.18)}[dir=rtl] .sf-m{left:auto;right:0}'
    + '.sf-m a{display:flex;align-items:center;min-height:36px;padding:0 10px;border-radius:8px;color:var(--text);font-size:14px;text-decoration:none}.sf-m a:hover,.sf-m a:focus-visible{background:var(--accent-soft,#eee);outline:none}'
    // Token vai trò dùng chung toàn app (docs/UX-PUBLIC.md § Tokens) – nằm ngoài khung app (0 byte SHELL): chữ phụ 14 px, hàng link/nút phụ 1 dòng cuộn ngang, đệm thẻ vừa phải
    + '.view p.muted,.view div.muted,.view span.muted{font-size:14px}.pron{gap:.4rem}'
    + '.set-btns:has(>a.btn){flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;gap:.4rem}.set-btns>a.btn.sm{flex:none;min-height:36px;padding:0 .8rem;font-size:13px;font-weight:600;background:none;color:var(--muted);border-color:var(--line)}'
    + '.card.empty{padding:28px 24px}@media(max-width:600px){.qk-card{padding:18px}}'
    + 'html.lk-fab{--fab-space:52px}@media(max-width:900px){html.lk-fab body:not(.cbt-mode):not(.bare) .view{padding-bottom:calc(68px + var(--fab-space) + env(safe-area-inset-bottom))}}'
    + 'body.bare .lk-rep,body.focus .lk-rep:not(.in-side),body.cbt-mode .lk-rep:not(.in-side),.lk-rep[hidden],.lk-rep.kb:not(.in-side){display:none}@media print{.lk-rep{display:none}}'
    + 'body:has(.learn-bar,.grade-bar,.sheet,.sel-bar,.install-nudge,#modal:not([hidden]),dialog[open],.acct-pop) .lk-rep:not(.in-side){display:none}'; // luật :has riêng – trình duyệt cũ bỏ qua mà không mất luật trên
  w.LexReportCSS = CSS; // test đọc
  // Chân thanh bên: giữ Blog + Giới thiệu, các link phụ (từ vựng, bài mẫu, liên hệ, pháp lý) vào popover "⋯ Xem thêm" (<details>: bàn phím Enter/Space, Esc đóng + trả focus)
  var compactFoot = function () {
    var f = d.querySelector('.side-foot'); if (!f || f.querySelector('.sf-more')) return;
    var dt = d.createElement('details'), L = w.t ? t('Xem thêm') : 'More'; dt.className = 'sf-more';
    dt.innerHTML = '<summary aria-haspopup="true"><span aria-hidden="true">⋯</span> <span data-i18n="Xem thêm">' + L + '</span></summary><div class="sf-m"></div>';
    var m = dt.lastChild;
    [].slice.call(f.querySelectorAll(':scope>a')).forEach(function (a) { if (!a.hasAttribute('data-blog') && a.getAttribute('data-l') !== 'about') m.appendChild(a); });
    f.appendChild(dt);
    var close = function (fx) { if (!dt.open) return; dt.open = false; if (fx) dt.firstChild.focus(); };
    dt.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); close(true); } });
    d.addEventListener('click', function (e) { if (!dt.contains(e.target)) close(); });
    dt.addEventListener('focusout', function (e) { if (e.relatedTarget && !dt.contains(e.relatedTarget)) close(); });
  };
  d.addEventListener('DOMContentLoaded', function () {
    var st = d.createElement('style');
    st.textContent = CSS;
    d.head.appendChild(st);
    var b = d.createElement('button');
    b.type = 'button'; b.className = 'lk-rep'; b.id = 'lkRep';
    b.innerHTML = '<span aria-hidden="true">⚑</span><span class="lk-rep-l" data-i18n="Báo lỗi">' + (w.t ? t('Báo lỗi') : 'Report') + '</span>'; // data-i18n: từ điển nạp sau vẫn dịch lại; nhãn ẩn = tên cho trình đọc màn hình
    b.title = w.t ? t('Báo lỗi') : 'Report';
    compactFoot();
    b.onclick = function () { b.disabled = true; load().then(function (R) { R.open(); }, function () {}).then(function () { b.disabled = false; }); };
    var html = d.documentElement, wide = w.matchMedia ? w.matchMedia('(min-width: 901px)') : null;
    var off = false, lastY = w.scrollY || 0;
    var setOff = function (v) { if (v !== off) { off = v; b.classList.toggle('off', v); } };
    var place = function () { // máy tính có thanh bên → vào chân thanh bên; còn lại → nút nổi
      var foot = d.querySelector('.side-foot'), side = !!(wide && wide.matches && foot);
      b.classList.toggle('in-side', side);
      if (side) { if (b.parentNode !== foot) foot.appendChild(b); }
      else if (b.parentNode !== d.body) d.body.appendChild(b);
      html.classList.toggle('lk-fab', !side && !b.hidden);
    };
    var sync = function () { b.hidden = HIDE.test(location.hash); setOff(false); lastY = w.scrollY || 0; place(); };
    w.addEventListener('hashchange', sync);
    if (wide && wide.addEventListener) wide.addEventListener('change', place);
    // Cuộn xuống → ẩn (nhường chỗ đọc), cuộn lên/về đầu trang → hiện lại
    w.addEventListener('scroll', function () { var y = w.scrollY || 0, dy = y - lastY; if (Math.abs(dy) < 8) return; setOff(dy > 0 && y > 80); lastY = y; }, { passive: true });
    b.addEventListener('focus', function () { setOff(false); }); // phím Tab tới nút → luôn hiện
    // Đang gõ (bàn phím ảo che nửa màn hình) → ẩn, không đè ô nhập
    var typing = function (el) { return !!(el && el !== b && el.matches && el.matches('input:not([type=checkbox]):not([type=radio]):not([type=button]):not([type=submit]),textarea,select,[contenteditable=""],[contenteditable=true]')); };
    d.addEventListener('focusin', function (e) { b.classList.toggle('kb', typing(e.target)); });
    d.addEventListener('focusout', function () { setTimeout(function () { b.classList.toggle('kb', typing(d.activeElement)); }, 0); });
    sync();
    // Đã từng gửi báo lỗi → lúc rảnh (≤ 1 lần/12 giờ) hỏi trạng thái mới để nhắc trong app
    try { if (localStorage.getItem('lk.rp') && Date.now() - (+localStorage.getItem('lk.rpc') || 0) > 432e5) setTimeout(function () { load().then(function (R) { R.poll(); }, function () {}); }, 9000); } catch (x) { /* bỏ qua */ }
  });
})(window, document);
