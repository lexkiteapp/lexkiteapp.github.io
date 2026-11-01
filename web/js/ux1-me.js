/* 🎨 Stitch v2 "Me" (#/me, cờ ux1): khung tự sinh web/js/st/v2/me.js · brand/stitch/v2/bind/me.json. Tải trong gói ux1 (lười, không vào khung app).
 * Bao routes.me của hubs.js: cờ ux1 bật → khung Stitch; tắt → trang cũ nguyên vẹn. MỌI mục của trang Tôi cũ vẫn có (xem docs/STITCH-V2-PORT.md, bảng "Tôi"):
 *   hồ sơ + chip kỳ thi · 3 ô số (chuỗi/XP/từ đã lưu) · huy hiệu · các nhóm hàng (Tùy chọn · Việc học · Từ vựng & tiến độ · Ứng dụng · Tìm hiểu thêm) · Đăng xuất/Đăng nhập.
 * (icons của #/league cũng khai ở đây) @icons celebration trending_down trending_flat light_mode dark_mode brightness_auto language track_changes notifications_active volume_up explore flag bar_chart ios_share emoji_events school fact_check badge military_tech local_library psychology verified alarm schedule local_fire_department ac_unit auto_awesome cloud admin_panel_settings settings install_mobile science newspaper info public article tune open_in_new chevron_right hotel_class flash_on lock */
(function () {
  const App = window.App; if (!App || !App.routes || !App.routes.me) return;
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
    const cap = p => Promise.race([p, new Promise(r => setTimeout(() => r(false), 500))]);
    const [isAdmin, blogOn] = await w(Promise.all([cap(App.isAdmin ? App.isAdmin().catch(() => false) : false), cap(App.blogLive ? App.blogLive().catch(() => false) : false)]));
    const sameSite = /(^|\.)lexkite\.(com|pages\.dev)$/.test(location.hostname), name = window.Sync && Sync.nice ? Sync.nice((u && u.displayName) || t('Bạn')) : (u && u.displayName) || t('Bạn');
    const goal = se.goal && se.goal.exam ? ex.short + ' ' + App.goalLabel(se.goal) : ex.short;
    const th = THEMES[se.theme] || THEMES.auto, lang = I18N.LANGS && I18N.LANGS[I18N.lang()] ? I18N.LANGS[I18N.lang()][1] : I18N.lang();
    const R = (k, icon, label, o = {}) => Object.assign({ k, icon, label, value: '', chev: 'chevron_right' }, o);
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
      { icon: 'info', title: t('Tìm hiểu thêm'), rows: [
        R('method', 'science', t('Cách Lexkite giúp bạn nhớ lâu'), { href: '#/method' }),
        R('blog', 'newspaper', t('Blog học tiếng Anh'), { href: App.blogHref(blogOn), ext: !sameSite, chev: sameSite ? 'chevron_right' : 'open_in_new' }),
        R('about', 'info', t('Trang giới thiệu'), { href: App.aboutUrl(), ext: !sameSite, chev: sameSite ? 'chevron_right' : 'open_in_new' }),
        R('res', 'public', t('Tài nguyên miễn phí'), { href: '#/resources' }),
        ...(I18N.lang() === 'vi' ? [['samples', 'Bài mẫu Writing Task 2'], ['speaking', 'Chủ đề Speaking'], ['tu-vung', 'Từ vựng theo chủ đề'], ['ngu-phap', 'Ngữ pháp tiếng Anh'], ['viet-thu', 'Thư mẫu IELTS General']].map(([p, l]) => R('vi-' + p, 'article', l, { href: 'https://lexkite.com/' + p + '/', ext: 1, chev: 'open_in_new' })) : [])] }
    ];
    secs.forEach(s => s.rows.forEach((r, i) => { r.v = r.tog ? 'tg' : r.value ? ['n1', 'n2', 'n3'][i % 3] : 'n2'; }));
    secs.forEach(s => { const out = []; s.rows.forEach((r, i) => { if (i) out.push({ v: 'hr' }); out.push(r); }); s.rows = out; });
    const have = g.badges || {}, B = (Game.BADGES || []).slice().sort((a, b) => (have[b.id] ? 1 : 0) - (have[a.id] ? 1 : 0) || (have[b.id] || 0) - (have[a.id] || 0));
    const ach = B.slice(0, 3).map((b, i) => ({ icon: BADGE_IC[b.id] || ACH_IC.first, name: b.name, sub: have[b.id] ? t('Đã đạt') : t('Chưa đạt'), v: 'a' + (1 + i) }));
    const photo = u && u.photoURL ? u.photoURL : '';
    return { ini: ini((u && (u.displayName || u.email)) || name), photo, name, target: goal, lEdit: t('Cài đặt'), lStreak: t('Chuỗi ngày'), lXp: t('Tổng XP'), lSaved: t('Đã lưu'), streak: num(streak || 0), xp: num(g.xp || 0), saved: num(totalC),
      lAch: t('Huy hiệu'), lAll: t('Xem tất cả'), ach, secs, out: u ? t('Đăng xuất') : (window.Sync && Sync.can === false ? '' : t('Đăng nhập')), ver: 'Lexkite' + (L.title ? ' · ' + L.title : '') };
  }

  const langModal = () => UI.modal(`<h2 style="margin-top:0">${esc(t('Ngôn ngữ'))}</h2><ul style="list-style:none;padding:0;margin:0;display:grid;gap:.4rem">${I18N.SUPPORTED.map(l => `<li><button type="button" class="btn block" data-lang="${l}" lang="${l}" dir="${l === 'ar' ? 'rtl' : 'ltr'}" aria-pressed="${l === I18N.lang()}" style="width:100%;justify-content:flex-start">${esc(I18N.LANGS[l][1])}</button></li>`).join('')}</ul>`);
  const esc = s => UI.esc(s);

  const render = App.guard ? App.guard : f => f;
  let paint = null;
  const me = render(async function () {
    const d = await build(), y = window.scrollY, ae = document.activeElement && document.activeElement.getAttribute && document.activeElement.getAttribute('data-act');
    const root = ST2.mount(view, 'me', d, 'me');
    if (App.getApp) App.getApp(view);
    view.querySelectorAll('[data-row="getapp"]').forEach(row => { const a = row.querySelector('[data-get-app]'); const sync = () => { row.hidden = !a || a.hidden || a.hasAttribute('data-off'); }; sync(); if (a && window.MutationObserver) new MutationObserver(sync).observe(a, { attributes: true, attributeFilter: ['hidden', 'data-off'] }); });
    if (ae) { const b = root.querySelector('[data-act="' + ae + '"]'); if (b) b.focus({ preventScroll: true }); window.scrollTo(0, y); }
    paint = () => me();
    if (root.__meBound) return; root.__meBound = 1;
    root.addEventListener('click', e => {
      const b = e.target.closest && e.target.closest('[data-act]'); if (!b) return; const a = b.getAttribute('data-act'), s = state.settings;
      if (a === 'theme') { const o = ['auto', 'light', 'dark']; s.theme = o[(o.indexOf(s.theme) + 1) % 3]; App.settingsDeps.applyTheme(); App.saveSettings(); paint(); }
      else if (a === 'lang') langModal();
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
