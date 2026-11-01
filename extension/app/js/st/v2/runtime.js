/* 🎨 Stitch v2 – lớp chạy: gắn khung TỰ SINH (web/js/st/v2/<màn>.js, scripts/stitch-v2-convert.mjs) vào #view với dữ liệu thật.
 * 1 DOM cho cả sáng/tối (class lt:/dk:), CSS biên dịch sẵn css/st-v2-<màn>.css. Điện thoại: đầu trang + thanh tab Stitch (shell.js) thay topbar/#bnav;
 * máy tính: giữ menu trái của app. Nút trong khung Stitch là <button data-href> → điều hướng ở đây (ủy quyền 1 lần cho #view).
 * @icons route style bolt emoji_events person */
(function () {
  const S = self.ST2 || (self.ST2 = {});
  // 5 tab chính (khóa = Ux1 tabOf) – icon theo mẫu Stitch v2
  const TABS = [['learn', '#/home', 'route', 'Học'], ['review', '#/review?hub=1', 'style', 'Ôn'], ['train', '#/train', 'bolt', 'Luyện'], ['league', '#/league', 'emoji_events', 'Giải đấu'], ['me', '#/me', 'person', 'Tôi']];
  S.tabs = on => TABS.map(([k, href, icon, l]) => ({ k, href, icon, label: t(l), on: k === on }));
  // Viên số đầu trang: kỳ thi · chuỗi ngày · XP · mục tiêu thẻ hôm nay (cùng nguồn với cột phải ux1.rail)
  S.hdr = () => { const st = App.state || {}, g = st.game || {}, se = st.settings || {}, X = (App.EXAMS || {})[se.exam || 'ielts'] || { short: 'IELTS' };
    const k = window.Core && Core.todayKey ? Core.todayKey() : '', rv = ((st.stats || {}).days || {})[k] || 0, goal = se.dailyGoal || 20;
    return { exam: X.short, streak: App.streak ? App.streak() : 0, xp: (g.xp || 0).toLocaleString(I18N.lang()), goal: `${Math.min(rv, goal)}/${goal}` }; };
  // 🔥 Ngọn lửa chuỗi (Stitch 30/10 "Tactile Flame", brand/stitch/v2/streak-light.html #streakFlame – path y nguyên, test streak-ui kiểm khớp).
  // Trạng thái CHỈ đổi màu (màu trong brand/tokens.json): active = màu Stitch · frozen (băng) · lost (xám) · milestone (vàng). Lửa lay nhẹ; tắt khi giảm chuyển động.
  const FL = 'M56 10C56 10 74 34 72 54C75 48 80 44 87 40C87 40 98 56 98 78C98 94 92 108 82 118C75 125 66 128 58 128C44 128 26 120 20 102C14 84 22 62 34 46C35 55 42 61 46 59C51 57 53 43 53 32C53 22 56 10 56 10Z';
  S.flame = (st, px) => { S.flameCss(); return `<svg class="st-fl" data-fl="${st || 'active'}" width="${Math.round(px * 6 / 7)}" height="${px}" viewBox="0 0 120 140" fill="none" aria-hidden="true" focusable="false"><path class="fl-ledge" d="${FL}" fill="#B53A22" transform="translate(0 7)"/><path class="fl-body" d="${FL}" fill="#F2553B" stroke="#B53A22" stroke-linejoin="round" stroke-width="5"/><path class="fl-mid" d="M57 38C57 38 69 54 68 70C71 65 74 62 80 60C80 60 84 74 82 89C80 102 71 114 58 116C46 116 34 107 32 94C30 81 37 68 44 58C45 64 49 67 52 65C55 63 56 50 57 38Z" fill="#FFB054"/><path class="fl-core" d="M58 66C58 66 68 78 68 92C68 102 61 108 55 108C49 108 44 101 44 93C44 82 52 74 58 66Z" fill="#FFC94A"/><path class="fl-shine" d="M36 50C33 55 28 67 27 78C26.5 83 29 86 31 83C33 80 34 73 37 64C38.5 59 39 53 36 50Z" fill="#FFE7C2"/></svg>`; };
  S.flameCss = () => { if (document.getElementById('stFlCss')) return; const s = document.createElement('style'); s.id = 'stFlCss';
    s.textContent = `.st-fl[data-fl=frozen]{--fl-l:#2A7D7A;--fl-b:#CFE9F2;--fl-m:#F4FBF8;--fl-c:#FFFFFF;--fl-s:#FFFFFF}.st-fl[data-fl=lost]{--fl-l:#5A7175;--fl-b:#A3B9B7;--fl-m:#F4FBF8;--fl-c:#F3F8F8;--fl-s:#FFFFFF}.st-fl[data-fl=milestone]{--fl-l:#B57A00;--fl-b:#FFC94A;--fl-m:#FFE7C2;--fl-c:#FFFFFF;--fl-s:#FFFFFF}
.st-fl:not([data-fl=active]) .fl-ledge{fill:var(--fl-l)}.st-fl:not([data-fl=active]) .fl-body{fill:var(--fl-b);stroke:var(--fl-l)}.st-fl:not([data-fl=active]) .fl-mid{fill:var(--fl-m)}.st-fl:not([data-fl=active]) .fl-core{fill:var(--fl-c)}.st-fl:not([data-fl=active]) .fl-shine{fill:var(--fl-s)}
.st-fl .fl-mid,.st-fl .fl-core{transform-box:fill-box;transform-origin:50% 100%}.st-fl[data-fl=active] .fl-mid,.st-fl[data-fl=milestone] .fl-mid{animation:stFl 1.6s ease-in-out infinite alternate}.st-fl[data-fl=active] .fl-core,.st-fl[data-fl=milestone] .fl-core{animation:stFl 1.1s ease-in-out -.5s infinite alternate}
@keyframes stFl{from{transform:scale(1,1)}to{transform:scale(.95,1.06)}}@media (prefers-reduced-motion:reduce){.st-fl .fl-mid,.st-fl .fl-core{animation:none}}`;
    document.head.appendChild(s); };
  // active | frozen (chưa học hôm nay, hôm qua dùng đóng băng) | lost (chuỗi 0) | milestone (màn chúc mừng mốc – truyền o.milestone)
  S.flameState = (n, o) => { if (o && o.milestone) return 'milestone'; if (!n) return 'lost';
    const g = (App.state || {}).game || {}, k = window.Core && Core.todayKey ? Core.todayKey() : '', y = new Date(Date.now() - 864e5), yk = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
    return !((g.days || {})[k] || {}).xp && (g.frozen || {})[yk] ? 'frozen' : 'active'; };
  let bound = false;
  S.mount = (view, k, d, tab) => {
    if (!S[k]) throw new Error('ST2: thiếu khung ' + k);
    d = Object.assign({ hdr: S.hdr(), tabs: S.tabs(tab) }, d);
    const o = S[k](d), sh = tab && S.shell ? S.shell(d) : { header: '', nav: '' };
    document.body.classList.add('st', 'v2on');
    view.innerHTML = `<div class="v2s-${k}"><div class="${o.root}">${o.header || sh.header}${o.main}${o.nav || sh.nav}</div></div>`; // v2s-<màn>: phạm vi CSS của màn (build-stitch-css important)
    if (!bound) { bound = true; view.addEventListener('click', e => { const b = e.target.closest && e.target.closest('.v2 [data-href]'); if (b && b.getAttribute('data-href') && b.getAttribute('aria-disabled') !== 'true') { e.preventDefault(); location.hash = b.getAttribute('data-href'); } }); }
    if (view.querySelector('.st-fl')) S.flameCss();
    App.onCleanup && App.onCleanup(() => document.body.classList.remove('st', 'v2on'));
    return view.firstElementChild.firstElementChild;
  };
})();
