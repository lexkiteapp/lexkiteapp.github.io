/* 🎨 Stitch v2 – lớp chạy: gắn khung TỰ SINH (web/js/st/v2/<màn>.js, scripts/stitch-v2-convert.mjs) vào #view với dữ liệu thật.
 * 1 DOM cho cả sáng/tối (class lt:/dk:), CSS biên dịch sẵn css/st-v2-<màn>.css. Điện thoại: đầu trang + thanh tab Stitch (shell.js) thay topbar/#bnav;
 * máy tính: giữ menu trái của app. Nút trong khung Stitch là <button data-href> → điều hướng ở đây (ủy quyền 1 lần cho #view).
 * @icons route style bolt emoji_events person */
(function () {
  const S = self.ST2 || (self.ST2 = {});
  // 5 tab chính (khóa = Ux1 tabOf) – icon theo mẫu Stitch v2
  const TABS = [['learn', '#/home', 'route', 'Học'], ['review', '#/review', 'style', 'Ôn'], ['train', '#/train', 'bolt', 'Luyện'], ['league', '#/league', 'emoji_events', 'Giải đấu'], ['me', '#/me', 'person', 'Tôi']];
  S.tabs = on => TABS.map(([k, href, icon, l]) => ({ k, href, icon, label: t(l), on: k === on }));
  // Viên số đầu trang: kỳ thi · chuỗi ngày · XP · mục tiêu thẻ hôm nay (cùng nguồn với cột phải ux1.rail)
  S.hdr = () => { const st = App.state || {}, g = st.game || {}, se = st.settings || {}, X = (App.EXAMS || {})[se.exam || 'ielts'] || { short: 'IELTS' };
    const k = window.Core && Core.todayKey ? Core.todayKey() : '', rv = ((st.stats || {}).days || {})[k] || 0, goal = se.dailyGoal || 20;
    return { exam: X.short, streak: App.streak ? App.streak() : 0, xp: (g.xp || 0).toLocaleString(I18N.lang()), goal: `${Math.min(rv, goal)}/${goal}` }; };
  let bound = false;
  S.mount = (view, k, d, tab) => {
    if (!S[k]) throw new Error('ST2: thiếu khung ' + k);
    d = Object.assign({ hdr: S.hdr(), tabs: S.tabs(tab) }, d);
    const o = S[k](d), sh = tab && S.shell ? S.shell(d) : { header: '', nav: '' };
    document.body.classList.add('st', 'v2on');
    view.innerHTML = `<div class="${o.root}">${o.header || sh.header}${o.main}${o.nav || sh.nav}</div>`;
    if (!bound) { bound = true; view.addEventListener('click', e => { const b = e.target.closest && e.target.closest('.v2 [data-href]'); if (b && b.getAttribute('aria-disabled') !== 'true') { e.preventDefault(); location.hash = b.getAttribute('data-href'); } }); }
    App.onCleanup && App.onCleanup(() => document.body.classList.remove('st', 'v2on'));
    return view.firstElementChild;
  };
})();
