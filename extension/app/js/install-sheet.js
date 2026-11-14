/* 📲 Mời cài app đúng "khoảnh khắc giá trị" (tải lười – gói 'install'; docs/INSTALL-GROWTH.md). Không có trong khung app.
 * Chỉ mời khi người học ĐÃ thấy giá trị: xong bài đầu tiên · chuỗi 3 ngày · lưu 20 từ. Không bao giờ ở lần mở đầu, không chặn học.
 * Chuẩn thông báo (docs/specs/notifications.md): mỗi khoảnh khắc tối đa 1 lần đời, ≤ 3 lần tổng, cách nhau ≥ 14 ngày, bấm "Để sau" 2 lần → thôi hẳn,
 * không hiện khi có hộp thoại khác đang mở / vừa hỏi quyền nhắc học / học sinh lớp học / dưới 13 tuổi / đã là app hoặc add-on.
 * Đích theo nền tảng do js/get-app.js (LKGetApp) chọn: Android → Google Play (intent mở app nếu đã cài), iPhone/iPad → App Store.
 * Máy tính (kind cws/web/dock): mã QR "Mang Lexkite lên điện thoại" → trang chủ lexkite.com (nút Tải app tự chọn Play/App Store theo máy quét, có utm=qr). Đếm ẩn danh /api/hit: inst_<khoảnh khắc>_<v|c|x>_<play|ios|desk> (xem|bấm|để sau × nền tảng). */
(function (g) {
  'use strict';
  const DAY = 864e5, MOMENTS = ['first', 'streak', 'words'], KEY = 'lk.inst', MAX_SHOWN = 3, GAP = 14 * DAY, MAX_DISMISS = 2, WORDS_AT = 20, STREAK_AT = 3;
  const tr = (k, p) => (g.t ? g.t(k, p) : String(k).replace(/\{(\w+)\}/g, (m, n) => (p && p[n] != null ? p[n] : m)));
  const rd = () => { try { const v = JSON.parse(g.localStorage.getItem(KEY) || '{}'); return v && typeof v === 'object' ? v : {}; } catch (e) { return {}; } };
  const wr = v => { try { g.localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) { /* bỏ qua */ } };
  const ev = (m, a, k) => { try { navigator.sendBeacon('/api/hit', JSON.stringify({ t: 'q', ev: 'inst_' + m + '_' + a + '_' + k })); } catch (e) { /* bỏ qua */ } };

  // Chuỗi ngày học liên tiếp (cùng công thức app.js streak(): hôm nay chưa học vẫn giữ chuỗi)
  function streakOf(days, now) {
    const d = new Date(now), key = x => x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'), on = x => { const e = (days || {})[key(x)]; return !!e && !!(e.xp || e.reviews); };
    let n = 0; if (!on(d)) d.setDate(d.getDate() - 1);
    while (on(d)) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  // Hàm THUẦN: chọn khoảnh khắc nên mời (hoặc '') – kiểm bằng scripts/test/install-sheet.mjs
  // ctx: { now, rec (lk.inst), lessons (số lần xong bài), days, cards, blocked (lý do không được mời) }
  function pick(ctx) {
    const rec = ctx.rec || {}, shown = rec.shown || {}, now = ctx.now;
    if (ctx.blocked) return '';
    if ((rec.dismissed || 0) >= MAX_DISMISS || Object.keys(shown).length >= MAX_SHOWN) return '';
    if (rec.last && now - rec.last < GAP) return '';
    if (!(ctx.lessons >= 1)) return ''; // chưa xong bài nào = chưa thấy giá trị (cũng chặn lần mở đầu)
    const st = streakOf(ctx.days, now);
    if (st >= STREAK_AT && !shown.streak) return 'streak';
    if (ctx.cards >= WORDS_AT && !shown.words) return 'words';
    if (!shown.first) return 'first';
    return '';
  }
  const body = (m, n) => m === 'streak' ? tr('Chuỗi {n} ngày thật tuyệt! Có app, việc học đều mỗi ngày nhẹ nhàng hơn.', { n }) : m === 'words' ? tr('Bạn đã lưu {n} từ. Có app, ôn chúng lúc nào cũng tiện.', { n }) : tr('Bài đầu tiên xong rồi! Có app, bạn học nhanh hơn ngay từ màn hình chính.');
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  // Android: intent mở app nếu đã cài, chưa cài → tự rơi về trang Google Play (có referrer đếm nguồn)
  function androidHref(play, m) {
    const ref = encodeURIComponent('utm_source=lexkite.com&utm_medium=install_sheet&utm_campaign=' + m), fb = play + (play.indexOf('?') < 0 ? '?' : '&') + 'referrer=' + ref;
    return 'intent://lexkite.com/app/#Intent;scheme=https;package=com.lexkite.app;S.browser_fallback_url=' + encodeURIComponent(fb) + ';end';
  }
  const target = (kind, m) => {
    const A = g.LK_APPS || {};
    if (kind === 'play') return { label: tr('Tải trên Google Play'), href: androidHref(A.play, m) };
    if (kind === 'ios') return { label: tr('Tải trên App Store'), href: A.ios + (A.ios.indexOf('?') < 0 ? '?' : '&') + 'ct=install_sheet_' + m };
    return null;
  };

  // Máy tính: QR trỏ trang chủ (nút "Tải app" ở đó chọn Play/App Store theo máy quét; utm=qr để đếm). Thư viện QR nạp lười (js/lib/qr.js, dùng chung với Chuyển dữ liệu).
  const qrUrl = m => 'https://lexkite.com/?utm_source=qr&utm_medium=install_sheet&utm_campaign=' + m;
  const qrLib = () => g.LKQR ? Promise.resolve() : new Promise(r => { const sc = document.createElement('script'); sc.src = '/js/lib/qr.js'; sc.onload = sc.onerror = () => r(); document.head.appendChild(sc); });

  let busy = false;
  async function consider(why) {
    if (busy || g.Store && Store.isExtension) return;
    busy = true;
    try {
      const S = g.state || {}, modal = document.getElementById('modal');
      const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true || !!(g.VBNative && VBNative.is);
      const ls = k => { try { return g.localStorage.getItem(k); } catch (e) { return null; } };
      const ask = (() => { try { return (JSON.parse(ls('lk.reask') || '{}') || {}).at || 0; } catch (e) { return 0; } })();
      const now = Date.now(), rec = rd();
      const blocked = standalone || ls('lk.edu') === '1' || ls('lk.u13') === '1' || !modal || !modal.hidden || now - ask < 2 * DAY || document.hidden;
      if (why === 'lesson' && !rec.lessons) { rec.lessons = 1; wr(rec); }
      const lessons = rec.lessons || (Object.keys((S.stats || {}).days || {}).length ? 1 : 0); // đã học từ trước khi có tính năng này cũng tính
      const m = pick({ now, rec, lessons, days: (S.game || {}).days, cards: Object.keys(S.cards || {}).length, blocked });
      if (!m) return;
      if (!g.LKGetApp) { try { await App.getApp(); } catch (e) { /* bỏ qua */ } }
      const kind = g.LKGetApp && LKGetApp.kind(), tg = target(kind, m);
      const n = m === 'streak' ? streakOf((S.game || {}).days, now) : Object.keys(S.cards || {}).length;
      if (tg) return show(m, tg, n, kind);
      if (!/^(cws|web|dock)$/.test(kind || '') || matchMedia('(pointer:coarse)').matches) return; // a2hs (iPhone chưa có link) / app gốc / máy cảm ứng: không mời
      await qrLib();
      if (g.LKQR) show(m, { qr: qrUrl(m) }, n, 'desk');
    } finally { busy = false; }
  }
  function show(m, tg, n, kind) {
    const rec = rd(); rec.shown = rec.shown || {}; rec.shown[m] = Date.now(); rec.last = Date.now(); wr(rec);
    ev(m, 'v', kind);
    const qr = !!tg.qr, esc2 = esc(tg.href || '');
    const box = UI.modal(`<div class="stack" style="text-align:center"><h2 id="isT" style="margin:0">${esc(tr(qr ? 'Mang Lexkite lên điện thoại' : 'Mang Lexkite theo bên mình'))}</h2><p class="small muted" id="isD" style="margin:0">${esc(body(m, n))}</p>
      ${qr ? `<div role="img" aria-label="QR" style="width:min(220px,60vw);aspect-ratio:1;margin:.25rem auto;padding:10px;background:#fff;border-radius:16px">${LKQR.svg(tg.qr)}</div><p class="small" style="margin:0">${esc(tr('Quét mã bằng camera điện thoại để tải app miễn phí.'))}</p>`
      : `<a class="btn primary block" id="isGo" href="${esc2}" target="_blank" rel="noopener" style="min-height:48px;display:flex;align-items:center;justify-content:center">📲 ${esc(tg.label)}</a>`}
      <button class="btn ${qr ? 'primary' : 'ghost'} block" data-close id="isNo" style="min-height:44px">${esc(tr(qr ? 'Đã hiểu' : 'Để sau'))}</button></div>`);
    if (!box) return;
    box.setAttribute('aria-labelledby', 'isT'); box.setAttribute('aria-describedby', 'isD');
    let acted = false;
    const go = box.querySelector('#isGo');
    if (go) go.addEventListener('click', () => { acted = true; ev(m, 'c', kind); UI.closeModal(); });
    else box.querySelector('#isNo').addEventListener('click', () => { acted = true; ev(m, 'c', kind); }); // QR: "Đã hiểu" = đã xem/quét, không tính từ chối
    const mo = new MutationObserver(() => { // đóng bằng nút/X/Esc/nền đều là "để sau"
      if (document.getElementById('modal').hidden) { mo.disconnect(); if (!acted) { const r = rd(); r.dismissed = (r.dismissed || 0) + 1; wr(r); ev(m, 'x', kind); } }
    });
    mo.observe(document.getElementById('modal'), { attributes: true, attributeFilter: ['hidden'] });
  }

  // Các thời điểm kiểm: xong bài/bài thi (chờ 6 s để không chồng lên màn thưởng/hỏi quyền nhắc học) và khi mở lại app (chuỗi/số từ tăng)
  const later = why => setTimeout(() => consider(why).catch(() => {}), why === 'lesson' ? 6000 : 4000);
  addEventListener('lexkite:practice-done', () => later('lesson')); addEventListener('lexkite:test-done', () => later('lesson'));
  if (!document.hidden) setTimeout(() => later('open'), 8000);
  g.Install = { pick, streakOf, androidHref, consider, MOMENTS };
})(window);
