/* 🎨 Stitch v2 "Me" (#/me, cờ ux1): khung tự sinh web/js/st/v2/me.js · brand/stitch/v2/bind/me.json. Tải trong gói ux1 (lười, không vào khung app).
 * Bao routes.me của hubs.js: cờ ux1 bật → khung Stitch; tắt → trang cũ nguyên vẹn. MỌI mục của trang Tôi cũ vẫn có (xem docs/STITCH-V2-PORT.md, bảng "Tôi"):
 *   hồ sơ + chip kỳ thi · 3 ô số (chuỗi/XP/từ đã lưu) · huy hiệu · các nhóm hàng (Tùy chọn · Việc học · Từ vựng & tiến độ · Ứng dụng · Tìm hiểu thêm) · Đăng xuất/Đăng nhập.
 * (icons của #/league cũng khai ở đây) @icons celebration trending_down trending_flat light_mode dark_mode brightness_auto language track_changes notifications_active volume_up explore flag bar_chart ios_share emoji_events school fact_check badge military_tech local_library psychology verified alarm schedule local_fire_department ac_unit auto_awesome cloud admin_panel_settings settings install_mobile science newspaper info public article tune open_in_new chevron_right hotel_class flash_on lock */
(function () {
  const App = window.App; if (!App || !App.routes || !App.routes.me) return;
  // Nhãn hàng là <a> bên trong span màu chữ → màu liên kết toàn cục (san hô) đè lên, trông như cảnh báo; tấm Tìm hiểu thêm
  try { if (!document.getElementById('meCss')) { const st = document.createElement('style'); st.id = 'meCss'; st.textContent = `.v2-me [data-row] a{color:inherit;text-decoration:none}
.me-more{list-style:none;padding:0;margin:0;display:grid}
#modal .me-more a,.me-more a{display:flex;align-items:center;gap:.75rem;min-height:48px;padding:.25rem .25rem;color:var(--text);text-decoration:none;font-weight:600;border-top:1px solid var(--line);text-decoration:none!important}
.me-more li:first-child a{border-top:0}
.me-more a:hover{background:var(--surface-2)}
.me-more .material-symbols-outlined{font-size:20px;color:var(--heading)}
.me-more a>span:nth-child(2){flex:1;min-width:0}
.me-more .me-more-c{color:var(--muted)}
[dir=rtl] .me-more .me-more-c{transform:scaleX(-1)}`; document.head.appendChild(st); } } catch (e) { /* bỏ qua */ }
  const { state, routes } = App, view = App.view, old = routes.me;
  const on = () => !!(self.ST2 && ST2.me && App.ux1On && App.ux1On());
  const num = n => (n || 0).toLocaleString(I18N.lang());
  const ini = s => { const w = String(s || '').trim().split(/\s+/).filter(Boolean); return ((w.length > 1 ? w[0][0] + w[1][0] : (w[0] || 'L').slice(0, 2)) || 'L').toUpperCase(); };
  const THEMES = { auto: ['brightness_auto', () => t('Tự động')], light: ['light_mode', () => t('Sáng')], dark: ['dark_mode', () => t('Tối')] };
  const ACH_IC = { first: 'hotel_class', streak: 'local_fire_department' };
  // Huy hiệu: Stitch vẽ biểu tượng Material trên ô màu (không dùng emoji). @icons hotel_class flash_on verified local_library menu_book school account_balance psychology emoji_events local_fire_department whatshot diamond rocket_launch military_tech mic auto_stories bolt bedtime wb_twilight target workspace_premium
  const BADGE_IC = { first: 'hotel_class', words50: 'menu_book', words200: 'local_library', words500: 'account_balance', master10: 'psychology', master100: 'emoji_events', streak3: 'local_fire_department', streak7: 'whatshot', streak30: 'diamond', rev500: 'rocket_launch', perfect5: 'verified', speaker: 'mic', reader: 'auto_stories', speed: 'flash_on', night: 'bedtime', early: 'wb_twilight', hunter: 'target', level5: 'military_tech', level10: 'workspace_premium' };

  async function build() {
    const w = App.W || (p => p), u = state.user, g = state.game || {}, se = state.settings || {}, cards = state.cards || {}, ex = (App.EXAMS || {})[App.exam()] || { short: 'IELTS', name: 'IELTS' };
    const L = Game.levelOf(g.xp || 0), streak = App.streak(), fi = window.Core && Core.Stats ? Core.Stats.freezeInfo(g) : { left: +g.freezes || 0, max: 2 };
    const deck = Object.values(cards).filter(c => c && c.srs), totalC = Object.keys(cards).length;
    const masteredC = deck.filter(c => c.srs.interval >= 21).length, learningC = deck.filter(c => (c.srs.reps > 0 || c.srs.last) && !(c.srs.interval >= 21)).length;
    const dueC = totalC ? Core.Cards.dueCount(cards, se, state.stats).due : 0, forgettingC = (App.forgetting ? App.forgetting() : []).length;
    let openMistakes = 0; try { const list = window.Core && Core.Store ? await w(Core.Store.get('mistakes', [])) : []; openMistakes = (list || []).filter(x => !x.fixed).length; } catch (e) { openMistakes = 0; }
    // Vẽ NGAY (cùng thanh tab): chỉ lấy đáp án đã có sẵn trong bộ nhớ đệm (isAdmin/blogLive trả ngay khi đã nhớ); chưa có thì vẽ như "không" rồi vẽ lại khi mạng trả lời
    //   (trước đây chờ mạng ≤ 500 ms trước khi vẽ gì → WebKit CI: thanh tab Tôi hiện muộn > 1 s). late = true khi đáp án thật khác bản đã vẽ.
    const cap = p => Promise.race([p, new Promise(r => setTimeout(() => r(undefined), 0))]), ask = f => (f ? f().catch(() => false) : Promise.resolve(false));
    const pa = ask(App.isAdmin), pb = ask(App.blogLive);
    const [a0, b0] = await w(Promise.all([cap(pa), cap(pb)])), isAdmin = !!a0, blogOn = !!b0;
    const late = Promise.all([pa, pb]).then(([x, y]) => !!x !== isAdmin || !!y !== blogOn);
    const sameSite = /(^|\.)lexkite\.(com|pages\.dev)$/.test(location.hostname), name = window.Sync && Sync.nice ? Sync.nice((u && u.displayName) || t('Bạn')) : (u && u.displayName) || t('Bạn');
    const goal = se.goal && se.goal.exam ? ex.short + ' ' + App.goalLabel(se.goal) : ex.short;
    const th = THEMES[se.theme] || THEMES.auto, lang = I18N.LANGS && I18N.LANGS[I18N.lang()] ? I18N.LANGS[I18N.lang()][1] : I18N.lang();
    const R = (k, icon, label, o = {}) => Object.assign({ k, icon, label, value: '', chev: 'chevron_right' }, o);
    // 📚 Liên kết đọc thêm (blog, giới thiệu, tài nguyên…) gom vào một tấm (act 'more') – trang Tôi gọn, không bỏ liên kết nào
    const more = [R('method', 'science', t('Cách Lexkite giúp bạn nhớ lâu'), { href: '#/method' }),
        R('blog', 'newspaper', t('Blog học tiếng Anh'), { href: App.blogHref(blogOn), ext: !sameSite, chev: sameSite ? 'chevron_right' : 'open_in_new' }),
        R('about', 'info', t('Trang giới thiệu'), { href: App.aboutUrl(), ext: !sameSite, chev: sameSite ? 'chevron_right' : 'open_in_new' }),
        R('res', 'public', t('Tài nguyên miễn phí'), { href: '#/resources' }),
        ...(I18N.lang() === 'vi' ? [['samples', 'Bài mẫu Writing Task 2'], ['speaking', 'Chủ đề Speaking'], ['tu-vung', 'Từ vựng theo chủ đề'], ['ngu-phap', 'Ngữ pháp tiếng Anh'], ['viet-thu', 'Thư mẫu IELTS General']].map(([p, l]) => R('vi-' + p, 'article', l, { href: 'https://lexkite.com/' + p + '/', ext: 1, chev: 'open_in_new' })) : [])];
    const secs = [
      { icon: 'tune', title: t('Tùy chọn'), rows: [
        R('theme', th[0], t('Chế độ màu'), { act: 'theme', value: th[1]() }),
        R('lang', 'language', t('Ngôn ngữ'), { act: 'lang', value: lang }),
        R('goal', 'track_changes', t('Mục tiêu & kế hoạch'), { href: '#/goal', value: goal }),
        R('notif', 'notifications_active', t('Bật nhắc học'), { tog: 1, act: 'notif', on: !!se.reminderOn }),
        R('sfx', 'volume_up', t('Hiệu ứng âm thanh'), { tog: 1, act: 'sfx', on: se.sfx !== false })] },
      { icon: 'school', title: t('Việc học'), rows: [
        R('exam', 'badge', t('Kỳ thi của bạn'), { act: 'exam', value: ex.short }),
        R('tracks', 'explore', t('Gói học'), { href: '#/tracks' }),
        R('stats', 'bar_chart', t('Tiến độ & huy hiệu'), { href: '#/stats', value: t('Cấp {n}', { n: L.level || 1 }) }),
        R('share', 'ios_share', t('Khoe thành tích'), { href: '#/stats', hook: ' data-share=""' }),
        R('league', 'emoji_events', t('Giải đấu tuần'), { href: '#/league' }),
        R('class', 'school', t('Lớp học'), { href: '#/class' }),
        R('mist', 'fact_check', t('Sổ lỗi sai'), { href: '#/mistakes', value: openMistakes ? String(openMistakes) : '' })] },
      { icon: 'local_library', title: t('Từ vựng'), rows: totalC ? [
        R('deck', 'local_library', t('Sổ từ của tôi'), { href: '#/deck', value: num(totalC) }),
        R('learning', 'psychology', t('Đang học'), { href: '#/deck', value: num(learningC) }),
        R('mastered', 'verified', t('Đã thuộc'), { href: '#/deck', value: num(masteredC) }),
        R('due', 'alarm', t('Cần ôn hôm nay'), { href: '#/review', value: num(dueC) }),
        R('golden', 'schedule', t('Thời điểm vàng'), { href: '#/review?src=forgetting', value: forgettingC ? t('{n} từ đang sắp quên', { n: forgettingC }) : t('Chưa có từ sắp quên') }),
        R('streak', 'local_fire_department', t('Chuỗi ngày'), { href: '#/stats', value: t('{n} ngày', { n: streak || 0 }) }),
        ...(fi.left ? [R('freeze', 'ac_unit', t('Đóng băng chuỗi: còn {n}/{max} lượt', { n: fi.left, max: fi.max || 2 }), { href: '#/stats', value: t('{n}/{max} lượt', { n: fi.left, max: fi.max || 2 }) })] : [])]
        : [R('first', 'auto_awesome', t('Bắt đầu học {n} từ đầu tiên', { n: 10 }), { href: '#/path' }), R('streak', 'local_fire_department', t('Chuỗi ngày'), { href: '#/stats', value: t('{n} ngày', { n: streak || 0 }) }),
          R('golden', 'schedule', t('Thời điểm vàng'), { href: '#/review?src=forgetting', value: t('Chưa có từ sắp quên') })] },
      { icon: 'settings', title: t('Ứng dụng'), rows: [
        ...(window.Sync && Sync.renderBox ? [R('acct', 'cloud', t('Tài khoản & đồng bộ'), { act: 'acct', value: u ? '' : t('Đăng nhập') })] : []),
        ...(isAdmin ? [R('admin', 'admin_panel_settings', t('Quản trị hệ thống'), { href: App.adminUrl(), ext: 1, chev: 'open_in_new' })] : []),
        R('settings', 'settings', t('Cài đặt'), { href: '#/settings' }),
        R('getapp', 'install_mobile', t('Tải app'), { href: '#/me', hook: ' data-get-app="me"' })] },
      { icon: 'info', title: t('Tìm hiểu thêm'), rows: [R('more', 'info', t('Tìm hiểu thêm'), { act: 'more', value: String(more.length) })] }
    ];
    secs.forEach(s => s.rows.forEach((r, i) => { r.v = r.tog ? 'tg' : r.value ? ['n1', 'n2', 'n3'][i % 3] : 'n2'; }));
    secs.forEach(s => { const out = []; s.rows.forEach((r, i) => { if (i) out.push({ v: 'hr' }); out.push(r); }); s.rows = out; });
    const have = g.badges || {}, B = (Game.BADGES || []).slice().sort((a, b) => (have[b.id] ? 1 : 0) - (have[a.id] ? 1 : 0) || (have[b.id] || 0) - (have[a.id] || 0));
    const ach = B.slice(0, 3).map((b, i) => ({ icon: BADGE_IC[b.id] || ACH_IC.first, name: b.name, sub: have[b.id] ? t('Đã đạt') : t('Chưa đạt'), v: 'a' + (1 + i) }));
    const photo = u && u.photoURL ? u.photoURL : '';
    return { late, ini: ini((u && (u.displayName || u.email)) || name), photo, name, target: goal, lEdit: t('Cài đặt'), lStreak: t('Chuỗi ngày'), lXp: t('Tổng XP'), lSaved: t('Đã lưu'), streak: num(streak || 0), xp: num(g.xp || 0), saved: num(totalC),
      lAch: t('Huy hiệu'), lAll: t('Xem tất cả'), ach, secs, more, out: u ? t('Đăng xuất') : (window.Sync && Sync.can === false ? '' : t('Đăng nhập')), ver: 'Lexkite' + (L.title ? ' · ' + L.title : '') };
  }

  const langModal = () => UI.modal(`<h2 style="margin-top:0">${esc(t('Ngôn ngữ'))}</h2><ul style="list-style:none;padding:0;margin:0;display:grid;gap:.4rem">${I18N.SUPPORTED.map(l => `<li><button type="button" class="btn block" data-lang="${l}" lang="${l}" dir="${l === 'ar' ? 'rtl' : 'ltr'}" aria-pressed="${l === I18N.lang()}" style="width:100%;justify-content:flex-start">${esc(I18N.LANGS[l][1])}</button></li>`).join('')}</ul>`);
  const esc = s => UI.esc(s);
  // Tấm "Tìm hiểu thêm": cùng danh sách liên kết cũ, mỗi hàng ≥ 44 px, liên kết ngoài mở tab mới
  const moreModal = list => UI.modal(`<h2 style="margin-top:0">${esc(t('Tìm hiểu thêm'))}</h2><ul class="me-more">${list.map(r => `<li><a href="${esc(r.href)}"${r.ext ? ' target="_blank" rel="noopener"' : ''}${r.hook || ''}><span class="material-symbols-outlined" aria-hidden="true">${esc(r.icon)}</span><span>${esc(r.label)}</span><span class="material-symbols-outlined me-more-c" aria-hidden="true">${r.ext ? 'open_in_new' : 'chevron_right'}</span></a></li>`).join('')}</ul>`);

  // Đầu trang Tôi trên điện thoại (< 1024 px, thanh trên của app ẩn): như mọi trang chính – có logo + nút tra từ (cùng ô #gq của app, Ux1.headBtns).
  //   4 viên số của mẫu Stitch giữ nguyên chỗ; logo 24 px + nút tra từ tròn 32 px đứng cạnh avatar (khoảng trống của mẫu). < 375 px: viên XP nhường chỗ
  //   (style.css – Tổng XP lớn ngay dưới trong trang Tôi).
  function hubHead(root) {
    const h = root.querySelector(':scope > header'), av = h && h.querySelector('a[href="#/me"]'); if (!av) return;
    const logo = document.createElement('img'); Object.assign(logo, { className: 'logo', src: 'icons/icon.svg?v=3', alt: 'Lexkite', width: 24, height: 24 }); logo.style.cssText = 'width:24px;height:24px;border-radius:7px;box-shadow:none';
    const sb = document.createElement('button'); sb.type = 'button'; sb.dataset.act = 'search'; sb.setAttribute('aria-label', t('Tra từ'));
    sb.className = "w-8 h-8 rounded-[9999px] flex items-center justify-center shrink-0 lt:bg-[#f2f4f3] dk:bg-[#162528] dk:border dk:border-[#213438] relative after:absolute after:-inset-1.5 after:content-['']";
    sb.innerHTML = '<svg class="i" aria-hidden="true" focusable="false"><use href="#i-search"/></svg>';
    const right = document.createElement('div'); right.className = 'flex items-center shrink-0'; right.style.gap = '4px'; av.before(right); right.append(logo, sb, av);
    if (window.Ux1 && Ux1.headBtns) Ux1.headBtns(h);
  }
  const render = App.guard ? App.guard : f => f;
  let paint = null, lastMore = [];
  const me = render(async function () {
    const d = await build(); lastMore = d.more; const y = window.scrollY, ae = document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute('data-act');
    const root = ST2.mount(view, 'me', d, 'me');
    d.late.then(ch => { if (ch && /^#\/me(\?|$)/.test(location.hash) && view.querySelector('.v2s-me')) me(); }, () => {}); // đáp án mạng về sau: chỉ vẽ lại khi vẫn ở trang Tôi
    hubHead(root);
    if (App.getApp) App.getApp(view);
    // Chưa đăng nhập: icon logout → login (đổi trong JS nên phải khai @icons login để có trong msym.woff2, nếu không chữ "login" hiện ra bị cắt – stitch-diff 06/11)
    if (!state.user) root.querySelectorAll('[data-act="out"] .material-symbols-outlined, [data-act="out"] .material-symbols-rounded').forEach(ic => { if (ic.textContent.trim() === 'logout') ic.textContent = 'login'; });
    view.querySelectorAll('[data-row="getapp"]').forEach(row => { const a = row.querySelector('[data-get-app]'); const sync = () => { row.hidden = !a || a.hidden || a.hasAttribute('data-off'); }; sync(); if (a && window.MutationObserver) new MutationObserver(sync).observe(a, { attributes: true, attributeFilter: ['hidden', 'data-off'] }); });
    if (ae) { const b = root.querySelector('[data-act="' + ae + '"]'); if (b) b.focus({ preventScroll: true }); window.scrollTo(0, y); }
    paint = () => me();
    if (root.__meBound) return; root.__meBound = 1;
    root.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('[data-act]'); if (!b) return; const a = b.getAttribute('data-act'), s = state.settings;
      if (a === 'theme') { const o = ['auto', 'light', 'dark']; s.theme = o[(o.indexOf(s.theme) + 1) % 3]; App.settingsDeps.applyTheme(); App.saveSettings(); paint(); }
      else if (a === 'lang') langModal();
      else if (a === 'more') { moreModal(lastMore); const m = document.querySelector('#modal .me-more'); if (m) m.addEventListener('click', ev => { if (ev.target.closest('a[href^="#"]')) UI.closeModal(); }); }
      else if (a === 'exam') App.examPicker();
      else if (a === 'notif') { s.reminderOn = !s.reminderOn; App.saveSettings(); if (window.Sync) Sync.schedule(); paint(); }
      else if (a === 'sfx') { s.sfx = s.sfx === false; Core.sfxOff = !s.sfx; App.saveSettings(); if (window.Sync) Sync.schedule(); if (s.sfx && window.Sfx) Sfx.correct(); paint(); }
      else if (a === 'acct') { const box = UI.modal('<section class="card me-acct" id="meAcct"></section>'); const el = (box && box.querySelector && box.querySelector('#meAcct')) || document.querySelector('#modal #meAcct'); if (el) Sync.renderBox(el); }
      else if (a === 'out') { if (state.user) Sync.ui('out', b); else Sync.signIn(); }
    });
  });
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-lang]'); if (!b || !b.closest('#modal')) return; UI.closeModal(); I18N.set(b.getAttribute('data-lang')); });
  routes.me = function () { return on() ? me.apply(this, arguments) : old.apply(this, arguments); };
  window.Ux1Me = { build };
})();
