/* Lexkite v2 – khung ứng dụng: router, trạng thái, trang chủ, thư viện, từ điển, sổ từ, tiến độ, cài đặt. */
(function () {
  const { Store, SRS, Cards, Stats, Golden, DEFAULT_SETTINGS, todayKey, endOfToday, DAY } = Core;
  const { TOPICS, INDEX, GROUPS } = IELTS_DATA;
  const { $, $$, esc, highlight, toast, modal, closeModal, speak, pic, levelChip, posChip, ring, download, xpFloat } = UI;
  const view = $('#view');

  const state = { cards: {}, settings: { ...DEFAULT_SETTINGS }, stats: { days: {}, newToday: { day: '', n: 0 } }, game: null, user: null };
  const allWords = () => TOPICS.flatMap(t => t.words);
  // Tra bộ từ theo id bằng Map (bản đồ lộ trình gọi hàng nghìn lần/lần vẽ – TOPICS.find tuyến tính từng là tác vụ dài #/path); TOPICS chỉ được push thêm → dựng lại khi đổi độ dài, bản đầu tiên thắng như find()
  let topIx = null;
  const topicOf = id => { if (!topIx || topIx.n !== TOPICS.length) { const m = new Map(); for (const t of TOPICS) if (!m.has(t.id)) m.set(t.id, t); topIx = { n: TOPICS.length, m }; } return topIx.m.get(id) || (App.subTopic && App.subTopic(id)); }; // + bài con lộ trình (path.js)
  const inDeck = w => !!state.cards[String(w).toLowerCase()];
  const masteryDots = s => UI.masteryDots(s, SRS);
  // Nguồn gốc của từ → các bộ từ cá nhân tự động
  const ORIGINS = {
    youtube: { emoji: '▶️', get name() { return t('Từ YouTube & video'); }, get desc() { return t('Lưu khi xem video có phụ đề'); } },
    web: { emoji: '🌐', get name() { return t('Từ trang web'); }, get desc() { return t('Lưu bằng add-on khi đọc báo, blog…'); } },
    reading: { emoji: '📖', get name() { return t('Từ bài đọc'); }, get desc() { return t('Lưu khi đọc bài trong Lexkite'); } },
    dict: { emoji: '🔎', get name() { return t('Từ tra từ điển'); }, get desc() { return t('Từ bạn tự tra và lưu'); } },
    library: { emoji: '📚', get name() { return t('Từ thư viện'); }, get desc() { return t('Thêm từ các bộ từ IELTS'); } },
    anki: { emoji: '🃏', get name() { return t('Từ Anki'); }, get desc() { return t('Nhập từ bộ thẻ Anki'); } },
  };
  function origin(c) {
    if (c.deck || c.topic === 'anki') return 'anki';
    const ctx = (c.contexts || []).find(x => x.source) || c.contexts[c.contexts.length - 1];
    if (ctx && ctx.source && /youtube\.com|youtu\.be|netflix|vimeo|ted\.com/.test(ctx.source)) return 'youtube';
    if (ctx && ctx.source && /^https?:/.test(ctx.source)) return 'web';
    if (ctx && /^Bài đọc/.test(ctx.title || '')) return 'reading';
    if (c.topic === 'mine' || !c.topic) return 'dict';
    return 'library';
  }
  const forgetting = () => Object.values(state.cards).filter(c => c.srs.reps > 0 && SRS.retention(c.srs) < Math.min(0.85, SRS.retentionTarget - 0.05));

  // ---------- Dữ liệu ----------
  async function load() {
    state.cards = await Cards.mine(); // thẻ của ngôn ngữ đích đang học (web/js/target.js; 'en' = như cũ)
    state.settings = { ...DEFAULT_SETTINGS, theme: 'auto', sfx: true, ...(await Store.get('settings', {})) };
    try { if (window.lkT && localStorage.getItem('lk.themeAt')) state.settings.theme = lkT() || 'auto'; } catch (e) { /* bỏ qua */ } // đổi ở landing/blog sau lần lưu cuối của app → theo lựa chọn mới nhất (lkT so mốc)
    SRS.retentionTarget = state.settings.retention || 0.9;
    // Một lần: sửa lỗi chính tả hỏi/ngã từ dữ liệu Google trong các thẻ đã lưu trước đây
    if (!state.settings.viFix1 && window.Dict && Dict.fixDeep) {
      const all = await Cards.all(); let n = 0;
      for (const c of Object.values(all)) { const f = Dict.fixDeep(c); if (JSON.stringify(f) !== JSON.stringify(c)) { await Cards.update(f); n++; } }
      state.settings.viFix1 = 1; await Store.set('settings', state.settings);
      if (n) state.cards = await Cards.mine();
    }
    state.stats = await Stats.get();
    state.game = await Game.get();
    Core.sfxOff = !state.settings.sfx;
    applyTheme();
    updateChrome();
  }
  const saveSettings = async o => { await Store.set('settingsAt', Date.now()); const r = await Store.set('settings', state.settings); if (window.VBNative && VBNative.scheduleReminder) VBNative.scheduleReminder({ ask: !!(o && o.ask === true && state.settings.onboarded) }); return r; }; // app gốc: đặt lại giờ nhắc học; chỉ xin quyền khi người dùng tự bật nhắc học (saveSettings({ ask: true }))

  // Ngày có học = có ôn thẻ hoặc có XP
  function activeDays() {
    const set = new Set(Object.keys(state.stats.days).filter(k => state.stats.days[k] > 0));
    for (const [k, v] of Object.entries(state.game.days || {})) if (v.xp > 0) set.add(k);
    Object.keys(state.game.frozen || {}).forEach(k => set.add(k)); // ngày được "đóng băng" vẫn tính vào chuỗi
    return set;
  }
  // 🧊 Đóng băng chuỗi: lỡ 1 ngày mà còn lượt → tự dùng; 7 ngày liên tiếp +1 lượt (≤ 2)
  async function applyFreeze() {
    const g = state.game, days = activeDays(), d = new Date(); d.setDate(d.getDate() - 1);
    const y = todayKey(d); d.setDate(d.getDate() - 1); const y2 = todayKey(d);
    if ((g.freezes || 0) > 0 && !days.has(y) && days.has(y2)) {
      state.game = await Game.mutate(gs => { gs.frozen = { ...(gs.frozen || {}), [y]: 1 }; gs.freezes = (gs.freezes || 0) - 1; gs.freezeSaved = todayKey(); const ks = Object.keys(gs.frozen).sort(); while (ks.length > 30) delete gs.frozen[ks.shift()]; });
      if (!window.StreakUI) setTimeout(() => toast(`🧊 ${t('Hôm qua bạn lỡ học – đã tự dùng 1 lượt đóng băng, chuỗi 🔥{n} ngày vẫn được giữ!', { n: streak() })}`, 4500), 1200); // có streak-ui → màn "đã cứu chuỗi" thay toast
    }
  }
  // 🛟 Cứu chuỗi: lỡ đúng 1 ngày và đã hết lượt đóng băng → Kit hỏi một lần trong ngày.
  // App (có quảng cáo): xem quảng cáo có thưởng; web: khiên miễn phí 1 lần/tháng. Chuỗi 0–1 ngày không hỏi.
  async function offerRescue() {
    const g = state.game, days = activeDays(), d = new Date(), today = todayKey(d); d.setDate(d.getDate() - 1);
    const y = todayKey(d); d.setDate(d.getDate() - 1);
    if (days.has(y) || g.rescueAsked === today) return;
    let prev = 0; while (days.has(todayKey(d))) { prev++; d.setDate(d.getDate() - 1); }
    if (prev < 2) return;
    state.game = await Game.mutate(gs => { gs.rescueAsked = today; });
    const month = today.slice(0, 7), native = !!(window.Capacitor && Capacitor.isNativePlatform && Capacitor.isNativePlatform());
    const freeLeft = state.game.rescueMonth !== month;
    // Có video có thưởng (cờ quảng cáo bật, còn lượt hôm nay) → mời xem video; không → khiên miễn phí như trước (web 1 lần/tháng, app không giới hạn)
    const viaAd = window.Ads ? await Ads.rewarded('streak', 1).catch(() => false) : false;
    if (!viaAd && !native && !freeLeft) return;
    const box = modal(`<div class="center">${window.Kit ? Kit.svg('sad', 84, true) : '🥺'}
      <h2 style="margin:.4rem 0">${t('Bạn lỡ quên 1 ngày?')}</h2>
      <p class="muted">${viaAd ? t('Xem 1 video ngắn để khôi phục chuỗi 🔥 {n} ngày!', { n: prev }) : t('Dùng khiên miễn phí (1 lần mỗi tháng) để khôi phục chuỗi 🔥 {n} ngày!', { n: prev })}</p>
      <div class="row center" style="gap:.6rem;margin-top:1rem;flex-wrap:wrap"><button class="btn primary" id="rsYes">${viaAd ? '▶ ' + t('Xem video để cứu chuỗi') : '🛟 ' + t('Dùng khiên cứu chuỗi')}</button><button class="btn ghost" id="rsNo">${t('Chấp nhận bắt đầu lại')}</button></div></div>`);
    $('#rsNo', box).onclick = () => closeModal();
    $('#rsYes', box).onclick = async () => {
      const ok = viaAd ? await Ads.rewarded('streak').catch(() => false) : true;
      if (!ok) { toast(t('Chưa xem hết video – chuỗi chưa được khôi phục')); return; }
      state.game = await Game.mutate(gs => { gs.frozen = { ...(gs.frozen || {}), [y]: 1 }; if (!viaAd && !native) gs.rescueMonth = month; });
      closeModal(); Sfx.win(); confetti(140); App.updateChrome && App.updateChrome();
      toast(`🎉 ${t('Chuỗi ngày học đã được giải cứu thành công!')}`, 4000);
    };
  }
  function streak() {
    const days = activeDays();
    let n = 0; const d = new Date();
    if (!days.has(todayKey(d))) d.setDate(d.getDate() - 1);
    while (days.has(todayKey(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  // lỡ chuỗi (hôm nay + hôm qua trống, trước đó ≥ 2 ngày) → số ngày cũ, không thì 0 – giáo viên an ủi (TeacherMood)
  function streakLost() { const days = activeDays(), d = new Date(); if (days.has(todayKey(d))) return 0; d.setDate(d.getDate() - 1); if (days.has(todayKey(d))) return 0; let n = 0; d.setDate(d.getDate() - 1); while (days.has(todayKey(d))) { n++; d.setDate(d.getDate() - 1); } return n >= 2 ? n : 0; }
  const masteredCount = () => Object.values(state.cards).filter(c => SRS.mastery(c.srs) === 3).length;

  // Số < 1000 không có dấu phân nhóm → khỏi khởi tạo Intl/ICU (lần đầu ~70 ms ở CPU mobile, tác vụ dài lúc khởi động – TBT). 'ar' dùng chữ số Ả Rập-Ấn → luôn qua Intl.
  const fmtInt = n => (Number.isInteger(n) && n >= 0 && n < 1000 && I18N.lang() !== 'ar' ? String(n) : n.toLocaleString(I18N.lang()));
  function updateChrome() {
    if (!state.game) return; // gọi sớm trước khi nạp xong dữ liệu (vd. đăng nhập gốc trả phiên lúc mở app) – nạp xong sẽ gọi lại
    if (App.updateExamChip) App.updateExamChip();
    const st = streak();
    const fi = (window.Core && Core.Stats && Core.Stats.freezeInfo) ? Core.Stats.freezeInfo(state.game) : { left: +state.game.freezes || 0 };
    const freezeCount = fi.left;
    $('#streakPill').innerHTML = `<i class="flame-icon" aria-hidden="true">${UI.icon('flame')}</i><span>${st}</span>${freezeCount ? `<span class="pill-sub">${UI.icon('snowflake')}${freezeCount}</span>` : ''}`;
    $('#streakPill').setAttribute('aria-label', freezeCount ? t('Chuỗi {n} ngày, {f} lượt đóng băng', { n: st, f: freezeCount }) : t('Chuỗi {n} ngày', { n: st }));
    $('#xpPill').innerHTML = `${UI.icon('star')}<span>${fmtInt(state.game.xp)}</span>`;
    const { total } = Cards.dueCount(state.cards, state.settings, state.stats);
    $$('[data-due]').forEach(b => { b.hidden = !total; b.textContent = total > 99 ? '99+' : total; b.title = t('{n} thẻ cần ôn', { n: total }); }); // tab Từ vựng: chấm nhỏ (CSS), số vẫn đọc được bằng trình đọc màn hình
    const L = Game.levelOf(state.game.xp);
    const name = state.user ? (state.user.displayName || state.user.email || t('Bạn')) : t('Bạn');
    $('#sideLevel').innerHTML = `<div class="lv-row">${avatarHtml()}<div class="grow lv-tx"><div class="lv-top"><b>${esc(name)}</b><span class="tiny muted"><bdi>${L.into}/${L.need} XP</bdi></span></div><div class="tiny muted lv-sub">${t('Cấp {n}', { n: L.level })} · ${esc(L.title)}</div><div class="progress xp thin" title="${esc(t('{a}/{b} XP tới cấp {n}', { a: L.into, b: L.need, n: L.level + 1 }))}"><i style="width:${L.into / L.need * 100}%"></i></div></div></div>`;
    if (window.Sync && Sync.chrome) Sync.chrome(); else $('#avatarBtn').innerHTML = avatarInner(); // nút tài khoản đầu trang + thẻ thanh bên (sync.js)
    if (window.VBNative && VBNative.widget) VBNative.widget(state, st); // widget màn hình chính/khóa (chỉ app gốc)
    if (App.retTrack) App.retTrack(st); // đo D7 nhóm bật/đối chứng của cờ ret (1–2 lượt ghi/máy, cả đời)
    if (App.ux1Track) App.ux1Track(st); // đo D1/D7 nhóm bật/đối chứng của cờ ux1 (≤ 3 lượt ghi/máy, cả đời)
  }
  const avatarInner = () => state.user && state.user.photoURL ? `<img src="${esc(state.user.photoURL)}" alt="" referrerpolicy="no-referrer">` : esc((state.user && (state.user.displayName || state.user.email) || 'L')[0].toUpperCase());
  const avatarHtml = () => `<span class="avatar">${avatarInner()}</span>`;

  // ---------- Theme ----------
  // Một lựa chọn chung app ↔ trang ngoài (landing, blog, pháp lý…): localStorage 'lk.theme' (+ mốc 'lk.themeAt'), cùng mã chống nháy
  // trong <head> (scripts/lib/site-layout.mjs THEME_HEAD → lkT()); đổi ở tab khác → sự kiện storage. Thanh trình duyệt (meta theme-color) theo --bg.
  const fadeTheme = () => { const r = document.documentElement; if (!fadeTheme.on || matchMedia('(prefers-reduced-motion: reduce)').matches) return; r.classList.add('lk-theming'); clearTimeout(fadeTheme.tm); fadeTheme.tm = setTimeout(() => r.classList.remove('lk-theming'), 240); };
  function applyTheme(o) {
    const t = state.settings.theme, r = document.documentElement, F = t === 'light' || t === 'dark';
    fadeTheme(); fadeTheme.on = 1;
    if (F) r.setAttribute('data-theme', t); else r.removeAttribute('data-theme');
    const bg = F && getComputedStyle(r).getPropertyValue('--bg').trim();
    document.querySelectorAll('meta[name=theme-color]').forEach(m => { if (!m.dataset.c) m.dataset.c = m.content; m.content = bg || m.dataset.c; });
    if (!(o && o.remote)) try { const ls = localStorage; if ((ls.getItem('lk.theme') || 'auto') !== t || !ls.getItem('lk.themeAt')) { if (F) ls.setItem('lk.theme', t); else ls.removeItem('lk.theme'); ls.setItem('lk.themeAt', Date.now()); } } catch (e) { /* bỏ qua */ }
  }
  { const mq = matchMedia('(prefers-color-scheme: dark)'), f = () => { if (state.settings.theme === 'auto') fadeTheme(); };
    if (mq && mq.addEventListener) mq.addEventListener('change', f); else if (mq && mq.addListener) mq.addListener(f); }
  addEventListener('storage', e => { if (e.key === 'lk.theme') { state.settings.theme = e.newValue === 'light' || e.newValue === 'dark' ? e.newValue : 'auto'; applyTheme({ remote: 1 }); } });
  // Nút 🌐: menu ngôn ngữ js/lang-menu.js (tải lười) → I18N.set
  if ($('#langMenu')) { const cur = I18N.lang(); $('#langCode').textContent = cur.toUpperCase(); $('#langMenu').innerHTML = I18N.SUPPORTED.map(l => `<li role="none"><button type="button" role="menuitemradio" aria-checked="${l === cur}" data-v="${l}" lang="${l}" dir="${l === 'ar' ? 'rtl' : 'ltr'}">${I18N.LANGS[l][1]}</button></li>`).join('');
    $('#langBtn').onclick = () => App.need('lsw').then(() => { const b = $('#langBtn'); if (!window.LkLangMenu) return; b.onclick = null; b.parentNode.lsw = 0; LkLangMenu(b.parentNode); b.click(); }); } // giao hẳn cho lang-menu.js (kể cả khi nó đã chạy trước từ trang chào) → không tự bấm lặp mở/đóng
  $('#themeBtn').onclick = () => {
    const order = ['auto', 'light', 'dark'];
    state.settings.theme = order[(order.indexOf(state.settings.theme) + 1) % 3];
    applyTheme(); saveSettings();
    toast({ auto: '🌓 ' + t('Giao diện theo hệ thống'), light: '☀️ ' + t('Giao diện sáng'), dark: '🌙 ' + t('Giao diện tối') }[state.settings.theme]);
  };
  // Nút sáng/tối ngay trong màn học (body.focus ẩn thanh trên; màn Stitch điện thoại cũng ẩn):
  // Màn Stitch (học/phản hồi/gọi/truyện/xong) có sẵn nút #lkTheme trong header mẫu (44 px) → chỉ gắn hành vi + biểu tượng theo giao diện; nút nằm trong mẫu (không chèn bằng JS).
  const isDark = () => { const r = document.documentElement; return r.getAttribute('data-theme') === 'dark' || (!r.hasAttribute('data-theme') && matchMedia('(prefers-color-scheme:dark)').matches); };
  const flipTheme = () => { state.settings.theme = isDark() ? 'light' : 'dark'; applyTheme(); saveSettings(); document.querySelectorAll('#lkTheme .material-symbols-outlined').forEach(i => { i.textContent = isDark() ? 'light_mode' : 'dark_mode'; }); };
  const focusTheme = () => {
    const v = $('#view'); if (!document.body.classList.contains('focus')) return;
    const own = v.querySelector('#lkTheme'); if (own && own.getClientRects().length) { if (!own.dataset.lk) { own.dataset.lk = 1; own.title = own.getAttribute('aria-label'); own.onclick = flipTheme; const i = own.querySelector('.material-symbols-outlined'); if (i) i.textContent = isDark() ? 'light_mode' : 'dark_mode'; } return; }
  };
  if ($('#view')) new MutationObserver(focusTheme).observe($('#view'), { childList: true });


  // ---------- Thưởng XP / nhiệm vụ / huy hiệu ----------
  async function reward(delta, el) {
    const ctx = { cards: Object.keys(state.cards).length, mastered: masteredCount(), streak: streak() + ((state.game.days[todayKey()] || {}).xp ? 0 : 1) };
    const r = await Game.track(delta, ctx);
    state.game = r.state;
    const st = streak();
    if (st && st % 7 === 0 && (state.game.freezes || 0) < 2 && state.game.freezeAt !== st) {
      state.game = await Game.mutate(gs => { gs.freezes = Math.min(2, (gs.freezes || 0) + 1); gs.freezeAt = st; });
      setTimeout(() => toast(`🧊 ${t('Chuỗi {n} ngày! Bạn nhận 1 lượt đóng băng – lỡ 1 ngày chuỗi vẫn được giữ (đang có {k})', { n: st, k: state.game.freezes })}`, 4500), 900);
    }
    if (delta.xp) xpFloat(delta.xp, el);
    for (const ev of r.events) {
      if (ev.type === 'quest') { Sfx.win(); toast(`🎉 ${t('Hoàn thành nhiệm vụ: {q} (+{xp} XP)', { q: ev.quest.text, xp: ev.quest.xp })}`, 3200); }
      if (ev.type === 'badge') { Sfx.win(); confetti(80); toast(`${t('Huy hiệu mới: {b}', { b: ev.badge.name })}`, 3500); }
      if (ev.type === 'level') {
        Sfx.win(); confetti(160);
        modal(`<div class="celebrate"><div class="em">🎖️</div><h2>${t('Lên cấp {n}!', { n: ev.level })}</h2><p class="muted">${t('Danh hiệu mới: <b>{title}</b>', { title: esc(ev.title) })}</p><button class="btn primary lg" data-close>${t('Tuyệt vời!')}</button></div>`);
      }
    }
    updateChrome();
    if (window.Sync) Sync.schedule();
    return r;
  }

  // ---------- Thêm từ ----------
  const enrichQueue = [];
  let enriching = false;
  async function enrichLater(word) {
    enrichQueue.push(word);
    if (enriching) return;
    enriching = true;
    while (enrichQueue.length) {
      const w = enrichQueue.shift();
      const c = state.cards[w];
      if (!c || c.tl || !navigator.onLine) continue; // thẻ ngôn ngữ đích khác: từ điển tiếng Anh không dùng được
      const e = await Dict.lookup(w, { image: c.pos === 'n' && !c.image, examples: !(c.sentences || []).length });
      if (e && e.found) {
        const cur = await Cards.patch(w, x => {
          if (!x.image && e.image) x.imageCredit = e.imageCredit || null;
          for (const k of ['ipa', 'ipaUS', 'audio', 'def', 'ex', 'vi', 'image']) if (!x[k] && e[k]) x[k] = e[k];
          if (!(x.sentences || []).length && e.sentences) x.sentences = e.sentences.slice(0, 2);
        });
        if (cur) state.cards[w] = cur;
      }
    }
    enriching = false;
  }

  async function addWord(entry, context, { silent } = {}) {
    const isNew = !inDeck(entry.word);
    const card = await Cards.add(entry, context);
    if (!window.Target || Target.ofCard(card) === Target.cur()) state.cards[card.word.toLowerCase()] = card;
    // Thêm lẻ → bổ sung dữ liệu ngay; thêm hàng loạt → để dành tới khi thẻ được ôn (tránh hàng trăm lượt gọi API)
    if (isNew && !silent) enrichLater(card.word.toLowerCase());
    updateChrome();
    if (window.Sync) Sync.schedule();
    if (!silent) Sfx.pop();
    return card;
  }

  // ---------- Router ----------
  const routes = {};
  const App = { enrichLater, ORIGINS, origin, forgetting, state, routes, load, reward, addWord, inDeck, allWords, topicOf, updateChrome, saveSettings, streak, streakLost, activeDays, masteredCount, masteryDots, view, avatarInner }; // avatarInner: stats-page.js (gói lười statsp)
  window.App = App;
  // Menu tài khoản MỘT bản (đầu trang Stitch điện thoại + avatar thanh trên): đủ mục mà thanh trên hẹp phải ẩn (sáng/tối, kỳ thi, XP) – không mất chức năng ở bất kỳ độ rộng/zoom nào
  App.accountMenu = () => {
    const X = (App.EXAMS || {})[App.exam ? App.exam() : 'ielts'] || {}, sh = String(X.short || '').replace(/[&<>"']/g, '');
    UI.modal(`<div class="ux1-menu"><h2>${t('Tài khoản')}</h2><p class="muted" data-m-xp>${UI.icon('star')} ${t('Tổng XP')}: <b>${fmtInt(state.game.xp)}</b></p><a class="btn" data-m="x" href="#/me">${t('Tài khoản')}</a><button type="button" class="btn ghost" data-m="exam">${t('Kỳ thi')}${sh ? ': ' + sh : ''}</button><button type="button" class="btn ghost" data-m="theme">${t('Đổi giao diện sáng/tối')}</button>${!state.user && window.Sync && Sync.gBtn ? Sync.gBtn() : ''}</div>`); // chưa đăng nhập: nút đăng nhập (avatar thanh trên lúc này mở menu) – sync.js xử lý data-acct
    const m = document.querySelector('.ux1-menu'); if (!m) return;
    m.addEventListener('click', e => { const w = e.target.closest('[data-m]'); if (!w) return; const v = w.dataset.m, c = UI.closeModal || window.closeModal; if (c) c(); if (v === 'exam' && App.examPicker) App.examPicker(); if (v === 'theme') $('#themeBtn').onclick(); });
  };
  // Avatar thanh trên: khi nút sáng/tối bị ẩn vì thiếu chỗ (≤ 900 px, 1024–1279 px, zoom lớn) → mở menu tài khoản thay vì sang #/me
  //   Ủy quyền trên document (pha bắt): sync.js vẽ lại #avatarBtn bằng outerHTML (nút đăng nhập / ảnh tài khoản) → bộ nghe gắn thẳng vào nút sẽ mất
  document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('#avatarBtn'), b = $('#themeBtn'); if (!a || !b || b.getClientRects().length || e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); e.stopPropagation(); App.accountMenu(); }, true);
  // Avatar đầu trang Stitch (< 1024 px, không có nút sáng/tối) → cùng menu tài khoản (mục "Tài khoản" vẫn sang #/me)
  document.addEventListener('click', e => { const a = e.target.closest && e.target.closest('.v2 header a[href="#/me"]'); if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); App.accountMenu(); }, true); // pha bắt: bộ chặn liên kết "#…" của index.html (<base>) đã preventDefault ở pha nổi trước bộ này
  // 🔥 Cờ lớp giữ thói quen (docs/RETENTION.md §5): ?ret=1/0 (thử máy này) > config ret '0' tắt khẩn / '1' bật hết > ret_pct: nhóm lk.rb (0–99, ngẫu nhiên, cố định theo máy) < ret_pct
  // Đo D7: App.retArm() = 'on' (nhóm bật) | 'off' (đối chứng cùng cỡ: lk.rb ∈ [50, 50+pct)) | '' → retTrack gửi 1 lần/máy 'seen' và 1 lần khi chuỗi chạm 7 (functions/api/hit.js RET_EV)
  const retCfg = () => { try { return JSON.parse(localStorage.getItem('lk.cfg') || '{}').v || {}; } catch (e) { return {}; } };
  const retB = () => { try { let b = localStorage.getItem('lk.rb'); if (b == null || isNaN(+b)) { b = String(Math.floor(Math.random() * 100)); localStorage.setItem('lk.rb', b); } return +b; } catch (e) { return 99; } };
  App.retArm = () => { const c = retCfg(), p = +c.ret_pct; if (c.ret === '0' || c.ret === '1' || !(p > 0 && p <= 50)) return ''; const b = retB(); return b < p ? 'on' : b >= 50 && b < 50 + p ? 'off' : ''; };
  App.retOn = () => { try { const q = /[?&]ret=([01])/.exec(location.search); if (q) localStorage.setItem('lk.ret', q[1]); const f = localStorage.getItem('lk.ret'); if (f === '1' || f === '0') return f === '1'; const c = retCfg(); if (c.ret === '0') return false; if (c.ret === '1') return true; const p = +c.ret_pct; return p > 0 && retB() < p; } catch (e) { return false; } };
  App.retTrack = st => { try { const a = App.retArm(); if (!a || localStorage.getItem('lk.noTrack') === '1') return; const go = (k, ev) => { if (localStorage.getItem(k)) return; localStorage.setItem(k, '1'); const u = (/(^|\.)lexkite\.(com|pages\.dev)$/.test(location.hostname) ? '' : 'https://lexkite.com') + '/api/hit', d = JSON.stringify({ t: 'q', ev }); navigator.sendBeacon ? navigator.sendBeacon(u, d) : fetch(u, { method: 'POST', body: d, keepalive: true, mode: 'no-cors' }).catch(() => {}); }; go('lk.rx', 'ret_' + a + '_seen'); if (st >= 7) go('lk.rd7', 'ret_' + a + '_d7'); } catch (e) { /* bỏ qua */ } };

  App.parseHash = () => parseHash(); // trang lười (dict-page.js) dùng chung
  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, '') || 'home';
    const [path, qs] = raw.split('?');
    const [name, ...rest] = path.split('/');
    return { name, arg: decodeURIComponent(rest.join('/') || ''), query: new URLSearchParams(qs || '') };
  }
  // ---------- Nạp module theo trang (lazy loading): trang đầu chỉ tải phần lõi, phần nặng tải khi cần ----------
  const G = 'js/grammar/', BUNDLES = {
    demo: ['js/app-demo.js'],
    grammar: ['js/i18n/en/arrange.js', 'js/word-arrange.js', 'js/structures.js', ...['tenses', 'verbs', 'sentences', 'foundation', 'starter', 'academic', 'chapters', 'book2', 'drills-a', 'drills-b', 'drills-c', 'drills-own', 'bank-gen', 'check'].map(f => f === 'drills-own' ? 'cpack/grammar/drills-own.js' : G + f + '.js'), 'js/grammar.js'],
    pas: ['js/i18n/en/v2.js', 'js/i18n/en/speak.js', 'js/st/common.js', 'js/st/v2/runtime.js', 'js/st/v2/pas-sit.js', 'js/st/v2/pas-drill.js', 'js/characters.js', 'js/speak/data.js', 'js/speak/score.js', 'js/speak/app.js'], // 🎙️ Play & Speak (cờ speak_pack, docs/specs/play-and-speak.md)
    pron: ['js/i18n/en/pron.js', 'js/pron/sounds.js', 'js/pron/skills.js', 'js/pron/pairs.js', 'js/pron/sayit.js', 'js/pron/coach.js', 'js/pron/rhythm.js', 'js/pron.js'],
    words: ['js/lib/topics-more.js', 'js/lib/skills.js', 'js/lib/awl.js', 'js/lib/ngsl.js', 'js/lib/ngsl2.js', 'js/lib/office.js', 'js/distract.js'], // 4 kho từ (~145 KB nén) – không chặn trang đầu, tải khi cần/lúc rảnh
    readings: ['js/readings.js', 'cpack/readings/more.js', 'js/choice-kit.js', 'js/cbt.js', 'js/method.js'], // 30 bài đọc – chỉ tải khi cần (trang chủ tự điền mục "Bài đọc hôm nay")
    klocal: ['js/klocal.js'], // Kokoro trên máy cho chữ chưa có file dựng sẵn (docs/specs/kokoro-on-device.md) – tự quyết có nạp mô hình hay không
    voice: ['js/listen/kvoice.js', 'js/listen/audio-index.js'], // danh mục giọng Kokoro: mọi lần phát âm từ/câu dùng giọng chất lượng cao nếu có
    handsfree: ['js/handsfree.js'],
    reflex: ['js/reflex.js'],
    watch: ['js/i18n/en/watch.js', 'js/watch-topics.js', 'js/watch.js'], // 🎬 Học qua video (#/watch) – docs/specs/video-learn.md
    handoff: ['js/lib/qr.js', 'js/handoff.js'], // 📲 chuyển dữ liệu bằng mã QR, không cần đăng nhập (mã hóa trên máy)
    roleplay: ['js/i18n/en/rpbasic.js', 'js/roleplay/data-everyday.js', 'js/roleplay/data-a.js', 'js/roleplay/data-b.js', 'js/roleplay/data-lot1.js', 'js/roleplay.js'], // Roleplay: 6 tình huống hằng ngày A1–A2 + 10 kịch bản công sở
    say: ['js/i18n/en/v2.js', 'js/i18n/en/say.js', 'js/i18n/en/share.js', 'js/st/v2/runtime.js', 'js/st/v2/shell.js', 'js/st/v2/say-front.js', 'js/st/v2/say-back.js', 'js/say.js'], // 🗣️ Say it like a native: thẻ phản xạ 2 mặt, khung Stitch v2 say-front/back (docs/SAY-NATIVE.md)
    call: ['js/i18n/en/v2.js', 'js/st/v2/runtime.js', 'js/st/v2/teacher-call.js', 'js/pron/pairs.js', 'js/listen/kvoice.js', 'js/lesson/engine.js', 'js/say-text.js', 'js/lesson/teacher.js', 'js/call/calls.js', 'js/call/calls-exam.js', 'js/call/calls-lot1.js', 'js/call/calls-lot2.js', 'js/call/engine.js', 'js/call.js'], // Call Ama/Carlos: cuộc gọi luyện nói rẽ nhánh, giáo viên khớp môi (docs/CALL.md); khung Stitch v2 teacher-call
    struct: ['js/structures.js'], // VBStruct cho popup dịch (phrases.js) – thiếu khóa này App.need('struct') ném TypeError
    courses: ['js/courses.js'], goal: ['js/i18n/en/goal.js', 'js/st/common.js', 'js/st/goal.js', 'js/goal.js'], // Mục tiêu & kế hoạch: tải lười (khung app chạm trần 380 KB)
    paraphrase: ['js/lib/paraphrase-data.js', 'js/paraphrase.js'],
    listening: ['js/choice-kit.js', 'js/qengine.js', 'js/i18n/en/qtips.js', 'js/qtips.js', ...[1, 2, 3, 4, 5, 6, 7, 8].map(n => `js/listen/test${n}.js`), 'cpack/listen/test9.js', 'cpack/listen/test10.js', 'js/listen/kvoice.js', 'js/listen/audio-index.js', 'js/listening.js'],
    writing: ['js/i18n/en/ideast.js', 'cpack/write/task2-more.js', 'js/write/task1-more.js', 'js/write/task1-more2.js', 'cpack/write/ideas.js', 'js/write.js', 'js/task1.js', 'js/models.js', 'cpack/write/models2.js', 'cpack/write/models3.js', 'cpack/write/models4.js', 'cpack/write/models5.js', 'js/write/gt-letters.js', 'js/letters.js', 'js/ideas.js', 'js/phrases-model.js'], // phrases-model.js: #/model #/models #/phrases (tách khỏi phrases.js 01/11)
    mock: ['js/choice-kit.js', 'js/qengine.js', 'js/i18n/en/qtips.js', 'js/qtips.js', 'js/readtest/_i.js', 'js/readtest/test1.js', 'js/readtest/test2.js', 'js/readtest/test3.js', 'js/readtest/test4.js', 'js/readtest/test5.js', 'js/readtest/test6.js', 'js/readtest/test7.js', 'js/readtest/test8.js', 'js/readtest/test9.js', 'js/readtest/test10.js', 'js/readtest/explain-a.js', 'js/readtest/explain-b.js', 'js/readtest/explain-c.js', 'js/readtest/explain-d.js', 'js/readtest/explain-e.js', 'js/readtest/explain-f.js', 'js/readtest/explain-g.js', 'js/readtest/gt1.js', 'js/readtest/gt2.js', 'js/readtest/explain-gt.js', 'js/readtest/gt3.js', 'js/mock.js', 'js/rtype.js'],
    dist: ['js/distract.js'],
    tsl: ['js/lib/tsl-a.js', 'js/lib/tsl-b.js', 'js/lib/domain-a.js', 'js/lib/domain-b.js', 'js/lib/exam-vocab.js', 'js/lib/exam-vocab2.js', 'js/lib/exam-vocab3.js', 'js/lib/nawl.js', 'js/lib/bsl.js'],
    speak: ['js/i18n/en/speakt.js', 'js/listen/kvoice.js', 'js/listen/audio-index.js', 'cpack/speak/samples.js', 'cpack/speak/more2.js', 'cpack/speak/more3.js', 'js/speak/more.js', 'js/speaking.js'], // Phòng Speaking: chỉ tải khi mở
    qstats: ['js/qengine.js', 'js/i18n/en/qtips.js', 'js/qtips.js'],
    pbook: ['cpack/framework/functions.js', 'cpack/framework/phrase-book.js'], // 🗣️ Sổ mẫu câu theo chức năng: nạp khi mở mục trong #/phrases lần đầu (scripts/framework/build-functions.mjs)
    cambridge: ['js/i18n/en/cambridge.js', 'js/choice-kit.js', 'js/qengine.js', 'cpack/cambridge/rubric.js', 'cpack/cambridge/a2/t1.js', 'js/cambridge.js'], // Cambridge A2–C2 (docs/specs/cambridge.md): thêm đề mới = thêm 1 đường dẫn ở đây
    toefl: ['js/i18n/en/arrange.js', 'js/word-arrange.js', 'js/choice-kit.js', 'js/qengine.js', 'js/i18n/en/qtips.js', 'js/qtips.js', 'cpack/toefl/data1.js', 'cpack/toefl/data2.js', 'cpack/toefl/data3.js', 'cpack/toefl/data4.js', 'js/toefl.js'],
    toeic: ['js/choice-kit.js', 'js/qengine.js', 'js/i18n/en/qtips.js', 'js/qtips.js', 'js/toeic/reading1.js', 'js/toeic/reading2.js', 'js/toeic/listening1.js', 'js/toeic/listening2.js', 'js/toeic/reading3.js', 'js/toeic/listening3.js', 'js/toeic/reading4.js', 'js/toeic/listening4.js', 'js/toeic/reading5.js', 'js/toeic/listening5.js', 'js/toeic/reading6.js', 'js/toeic/listening6.js', 'js/toeic/reading7.js', 'js/toeic/listening7.js', 'js/toeic/sw1.js', 'js/toeic.js'],
    nxs: ['js/i18n/en/nextstep.js', 'js/next-step.js'], league: ['js/league.js'], classroom: ['js/i18n/en/classroom.js', 'js/classroom.js'], // 🏫 Lớp học (giáo viên/học sinh)
    criteria: ['js/i18n/en/criteria.js', 'js/criteria.js'],
    resources: ['js/i18n/en/resources.js', 'js/resources.js'], // 🌐 Tài nguyên miễn phí (tách khỏi khung)
    pnodes: ['js/i18n/en/pathn.js', 'cpack/lesson/path-nodes.js'], // nội dung nút Lộ trình (dữ liệu + bản dịch lười, ngoài gói ngôn ngữ web/js)
    pathx: ['js/i18n/en/pathx.js', 'js/path-reward.js', 'js/tracks.js', 'js/path-mix.js', 'js/path-day.js'], onb: ['js/i18n/en/v2.js', 'js/st/common.js', 'js/st/v2/runtime.js', 'js/st/v2/onb-goal.js', 'js/st/v2/onb-level.js', 'js/st/v2/onb-target.js', 'js/st/v2/onb-pace.js', 'js/st/v2/onb-ready.js', 'js/characters.js', 'js/onboard.js'], welcome: ['js/i18n/en/v2.js', 'js/st/common.js', 'js/st/v2/runtime.js', 'js/st/v2/welcome.js', 'js/st/v2/welcome-desk.js', 'js/characters.js', 'js/welcome.js'], // 🚀 thiết lập lần đầu từng bước (chuỗi ở en/pathx.js) // 🏁 Màn thưởng cuối bước lộ trình (path.js gọi khi xong lượt)
    notices: ['js/i18n/en/notices.js', 'js/notices.js'], // 🔔 Chuông thông báo người học (tải lười sau khi vẽ trang) // 📋 Tiêu chí chấm IELTS Writing & Speaking
    ota: ['js/i18n/en/ota.js', 'js/ota-key.js', 'js/ota.js'], // 🔄 cập nhật OTA + nhắc cập nhật app (chỉ app gốc, docs/OTA.md)
    remind: ['js/i18n/en/remind.js', 'js/remind.js'], settings: ['js/settings.js'], // ⚙️ Cài đặt (tách khỏi khung 23/10)
    streak: ['js/streak-ui.js'], ret: ['js/i18n/en/ret.js', 'js/retention.js'], // 🔥 lớp giữ thói quen – luôn nạp cùng gói 'streak' (mỗi file chỉ thuộc 1 gói) struct: ['js/structures.js'], // 🧩 nhận diện cấu trúc (tải lười, ra khỏi khung app 20/10)
    dictp: ['js/dict-page.js'], statsp: ['js/stats-page.js'], // 📖 trang Từ điển #/dict (tách khỏi app.js 01/11)
    vcore: ['js/verbs-core.js'], verbs: ['js/verbs.js'], fixer: ['js/writecheck-rules.js', 'js/fixer.js'], // 🔤 Chia động từ · ✍️ Sửa ngữ pháp
    uidx: ['js/usage-index.js'], usage: ['js/i18n/en/usage.js', 'js/choice-kit.js', 'js/usage-core.js', 'js/usage.js'], uP: ['js/usage/prep-adj.js', 'js/usage/prep-verb.js', 'js/usage/prep-noun.js'], uV: ['js/usage/verb.js'], uA: ['js/usage/adv.js'], uS: ['js/usage/struct.js'], uC: ['js/usage/pair.js'], // 📘 Cách dùng từ (dữ liệu theo nhóm, usage.js tự gọi App.need)
    placement: ['js/placement.js'], // 🧭 Kiểm tra đầu vào thích ứng (ước tính band + khoảng tin cậy)
    outcome: ['js/i18n/en/outcomes.js', 'js/writecheck-rules.js', 'cpack/outcomes/forms.js', 'cpack/outcomes-app/outcomes-core.js', 'cpack/outcomes-app/outcomes.js'],
    espr: ['js/i18n/en/espr.js', 'js/i18n/en/lesson.js', 'js/i18n/en/v2.js', 'js/st/common.js', 'js/st/lesson.js', 'js/st/v2/runtime.js', 'js/st/v2/lesson-question.js', 'js/st/v2/feedback-correct.js', 'js/st/v2/feedback-wrong.js', 'js/st/v2/lesson-complete.js', 'js/qengine.js', 'cpack/es/dr.js', 'cpack/es/px.js', 'js/espr.js', 'cpack/es-app/pron-ui.js'], calles: ['cpack/es/cl.js'], esx: ['cpack/es-app/exam-ui.js'], esday: ['cpack/es/dy.js', 'cpack/es/wd.js', 'cpack/es-app/day-ui.js'], // 🇪🇸 Luyện tiếng TBN (spanish-course.md W2b); dữ liệu cpack/es
    lvideo: ['js/i18n/en/lvideo.js', 'js/lib/video-rank.js', 'js/lesson-video.js'], // 🎬 Video bài học (thẻ từ, ngữ pháp, ngày học) – docs/VIDEO-SCALE-PLAN.md §10
    vimg: ['js/vocab-img.js'], // 🖼️ Ảnh minh họa theo nghĩa – CHỈ tải khi cờ vocab_img bật (App.vimgReady), khung app +0
    wordcard: ['js/wordcard.js'], // 🧠 Khối "Hiểu sâu" của thẻ từ (mẹo nhớ · lỗi sai/đúng · dùng khi thi · họ từ)
    ailocal: ['js/ai-local.js'], // 🔒 AI trên máy (Chrome/Edge built-in AI) – chỉ tải khi một tính năng AI cần, xem docs/AI-LOCAL.md
    anki: ['js/lib/save-file.js', 'js/anki.js'], // 🃏 Xuất/nhập Anki (.apkg/.txt/.csv) – chỉ tải khi mở hộp thoại Anki
    share: ['js/lib/qr.js', 'js/lib/save-file.js', 'js/share-card.js'], xport: ['js/export.js'], file: ['js/lib/save-file.js'], lsw: ['js/lang-menu.js'],
    quick: ['js/i18n/en/quick.js', 'js/quick.js'],
    pgames: ['js/study-games.js', 'cpack/play-app/play-blitz.js'], // ⚡ Thử thách 60 giây (docs/specs/play-learn.md)
    rmodes: ['js/i18n/en/rmodes.js', 'js/study-modes.js'], // 🔁 Ôn tập đa chế độ (Gõ phản xạ · Nghe chọn nghĩa) + ✍️ thẻ "Câu của bạn" [P2-1.2/P2-1.1-UI]
    swipe: ['js/study-swipe.js'], // ⚡ Ghép thẻ + 🎙️ Phát âm · 👆 vuốt thẻ + 🐦 Kit mini (G2)
    wfeed: ['js/i18n/en/wfeed.js', 'js/widget-feed.js'], // 📱 widget "Từ mỗi giờ" (chỉ app gốc – native.js nạp)
    lfx: ['js/i18n/en/lfx.js', 'js/choice-kit.js', 'js/lesson-fx.js'],
    adoffer: ['js/i18n/en/adoffer.js', 'js/ad-offers.js'], // 🎁 Cơ hội 2 · x2 XP ở thẻ kết quả (docs/ADS.md §1c)
    i18nx: ['structs', 'toefl', 'league', 'call', 'handoff'].map(n => `js/i18n/en/${n}.js`), // chuỗi giao diện trang tải lười (xem App.need)
    i18nl: ['verbs', 'exams', 'skills', 'lazyui'].map(n => `js/i18n/en/${n}.js`), // chuỗi Chia động từ/Sửa ngữ pháp, đề thi, Ngữ pháp/Speaking/Phát âm (ra khỏi en.js 27/10; add-on không cần nên tách khỏi i18nx)
    ux1: ['js/i18n/en/ux1.js', 'js/say-text.js', 'js/i18n/en/v2.js', 'js/st/common.js', 'js/st/home.js', 'js/st/v2/runtime.js', 'js/st/v2/shell.js', 'js/st/v2/path.js', 'js/st/v2/review.js', 'js/st/v2/practice.js', 'js/st/v2/leagues.js', 'js/st/v2/me.js', 'js/st/v2/streak.js', 'js/st/v2/exam-readiness.js', 'js/st/v2/today.js', 'js/st/v2/today-new.js', 'js/st/v2/today-desk.js', 'js/st/v2/today-rail.js', 'js/ux1.js', 'js/ux1-me.js'], lesson: ['js/i18n/en/lesson.js', 'js/i18n/en/v2.js', 'js/st/common.js', 'js/st/lesson.js', 'js/st/v2/runtime.js', 'js/st/v2/lesson-question.js', 'js/st/v2/feedback-correct.js', 'js/st/v2/feedback-wrong.js', 'js/st/v2/lesson-complete.js', 'js/st/v2/story-duo.js', 'js/listen/kvoice.js', 'js/lesson/engine.js', 'js/i18n/en/arrange.js', 'js/word-arrange.js', 'js/lesson/teacher.js', 'cpack/lesson/stories.js', 'cpack/lesson/path-nodes.js', 'js/lesson/ui.js'], lgold: ['cpack/lesson/gold.js'], // 🧩 Bài học trộn bài tập nhỏ (cờ lesson_mix, docs/LESSON-ENGINE.md) · gold bank cho "Giải thích"
    vhub: ['js/st/v2/vocab-hub.js', 'js/vocab-hub.js'], // 📚 Tab Từ vựng
    confidence: ['js/i18n/en/confidence.js', 'js/confidence/data.js', 'js/confidence.js'], // 🔥 Nhịp buổi học: chuỗi đúng liền, lỗi chính tả nhỏ, Giải thích, thẻ số liệu cuối lượt, tạm tắt nghe/nói, chế độ khó
  };
  const EXT_NO = ['klocal']; if (Store.isExtension) EXT_NO.forEach(n => { BUNDLES[n] = []; }); // gói mà build-extension.sh loại khỏi add-on (CWS cấm mã tải từ xa) → không nạp, khỏi 404 + nạp lại. Test: ext-bundles
  const PAINT_FIRST = new Set(['home', 'review']), PAINT_LATE = new Set(['words']); // route vẽ trước khi có kho từ (mọi chỗ dùng kho đều có dự phòng: study.js libNorm/distractors, ux1 units = data.js)
App.pathnPack = { es: 'cpack/lesson/pn-es.js', pt: 'cpack/lesson/pn-pt.js', fr: 'cpack/lesson/pn-fr.js', de: 'cpack/lesson/pn-de.js', id: 'cpack/lesson/pn-id.js', th: 'cpack/lesson/pn-th.js', zh: 'cpack/lesson/pn-zh.js', ja: 'cpack/lesson/pn-ja.js', ko: 'cpack/lesson/pn-ko.js', hi: 'cpack/lesson/pn-hi.js', ar: 'cpack/lesson/pn-ar.js', ru: 'cpack/lesson/pn-ru.js', tr: 'cpack/lesson/pn-tr.js' }; // bản dịch nội dung nút Lộ trình (nhóm i18n pathn, scripts/lib/i18n-pack.mjs), nạp cùng dữ liệu nút
App.esGx = { en: 'cpack/es/gx-en.js', vi: 'cpack/es/gx-vi.js', es: 'cpack/es/gx-es.js', pt: 'cpack/es/gx-pt.js', fr: 'cpack/es/gx-fr.js', de: 'cpack/es/gx-de.js', id: 'cpack/es/gx-id.js', th: 'cpack/es/gx-th.js', zh: 'cpack/es/gx-zh.js', ja: 'cpack/es/gx-ja.js', ko: 'cpack/es/gx-ko.js', hi: 'cpack/es/gx-hi.js', ar: 'cpack/es/gx-ar.js', ru: 'cpack/es/gx-ru.js', tr: 'cpack/es/gx-tr.js' }; // giải thích ngữ pháp TBN theo ngôn ngữ người học, tải lười 1 gói (js/espr.js)
App.esX = { lv: { A1: 'cpack/es/x-A1.js', A2: 'cpack/es/x-A2.js', B1: 'cpack/es/x-B1.js' }, ui: { en: 'cpack/es/x-ui-en.js', vi: 'cpack/es/x-ui-vi.js', es: 'cpack/es/x-ui-es.js', pt: 'cpack/es/x-ui-pt.js', fr: 'cpack/es/x-ui-fr.js', de: 'cpack/es/x-ui-de.js', id: 'cpack/es/x-ui-id.js', th: 'cpack/es/x-ui-th.js', zh: 'cpack/es/x-ui-zh.js', ja: 'cpack/es/x-ui-ja.js', ko: 'cpack/es/x-ui-ko.js', hi: 'cpack/es/x-ui-hi.js', ar: 'cpack/es/x-ui-ar.js', ru: 'cpack/es/x-ui-ru.js', tr: 'cpack/es/x-ui-tr.js' } }; // luyện định dạng DELE/SIELE W5 (cpack/es-app/exam-ui.js): đề theo cấp + nhãn theo ngôn ngữ người học, tải lười
App.esPx = { en: 'cpack/es/px-en.js', vi: 'cpack/es/px-vi.js', es: 'cpack/es/px-es.js', pt: 'cpack/es/px-pt.js', fr: 'cpack/es/px-fr.js', de: 'cpack/es/px-de.js', id: 'cpack/es/px-id.js', th: 'cpack/es/px-th.js', zh: 'cpack/es/px-zh.js', ja: 'cpack/es/px-ja.js', ko: 'cpack/es/px-ko.js', hi: 'cpack/es/px-hi.js', ar: 'cpack/es/px-ar.js', ru: 'cpack/es/px-ru.js', tr: 'cpack/es/px-tr.js' }; // gói phát âm TBN W3 theo ngôn ngữ người học (js/espr-pron.js): nhãn giao diện + giải thích 8 chủ đề
  const ROUTE_BUNDLE = { welcome: 'welcome', vocab: ['ux1', 'words', 'vhub'], outcome: 'outcome', speak: 'pas', train: 'ux1', lesson: 'lesson', streak: ['streak', 'ret'], confidence: ['roleplay', 'confidence'], settings: ['remind', 'settings'], class: 'classroom', paraphrase: 'paraphrase', courses: 'courses', goal: 'goal', course: 'courses', handsfree: ['words', 'tsl', 'voice', 'handsfree'], reflex: ['words', 'voice', 'readings', 'reflex'], watch: 'watch', roleplay: 'roleplay', call: 'call', say: 'say', handoff: 'handoff', letters: 'writing', reading: 'readings', read: 'readings', cbt: 'readings', method: 'readings', grammar: ['grammar', 'lfx'], placement: ['words', 'grammar', 'placement'], pron: 'pron', listening: 'listening', listen: ['listening', 'toeic'], 'listen-test': 'listening', dictation: ['listening', 'toeic'],
    cambridge: ['listening', 'cambridge'], toefl: ['listening', 'toefl'], 'toefl-p': ['listening', 'toefl'],
    toeic: ['tsl', 'listening', 'toeic'], qstats: 'qstats', 'toeic-r': ['toeic'], 'toeic-sw': ['toeic'], 'toeic-test': ['listening', 'toeic'], library: ['words', 'tsl'], topic: ['words', 'tsl'], practice: ['words', 'tsl', 'lfx'], dict: ['vcore', 'uidx', 'dictp'], verb: ['vcore', 'verbs', 'uidx'], fix: ['fixer', 'uidx'], usage: ['vcore', 'uidx', 'usage'], write: 'writing', task1: 'writing', model: 'writing', models: 'writing', phrases: 'writing', ideas: 'writing', rtype: 'mock', speaking: 'speak', mock: ['listening', 'writing', 'speak', 'mock'], home: ['words', 'streak'], path: ['words', 'pathx'], day: ['words', 'pathx'], review: 'words', deck: 'words', stats: ['words', 'streak', 'statsp'], league: 'league', criteria: 'criteria', resources: 'resources', quick: ['words', 'quick'], style: 'quick'};
  const bundleP = {};
  // Phần nặng tải từ CDN jsDelivr (theo commit); CDN lỗi → máy chủ chính.
  const CDN = (() => { try { if (Store.isExtension || (window.VBNative && VBNative.is)) return null; const el = document.getElementById('vb-cdn'); return el ? JSON.parse(el.textContent) : null; } catch (e) { return null; } })(); // { base: GitHub Pages, files: [file dữ liệu] }
  let cdnDown = false;
  const loadOne = src => new Promise(res => { const s = document.createElement('script'); s.src = src; s.async = false; s.onload = () => res(true); s.onerror = () => res(false); document.head.appendChild(s); });
  const UNHASH = /^\/?h\/(.+)\.[0-9a-f]{10}(\.(?:js|css))$/; // h/js/x.<băm>.js → js/x.js (dự phòng khi bản băm đã gỡ)
  const loadScript = async src => {
    const viaCdn = CDN && !cdnDown && CDN.files.includes(src);
    if (viaCdn && await loadOne(CDN.base + src)) {}
    else {
      if (viaCdn) cdnDown = true; // CDN lỗi → từ giờ dùng máy chủ chính cho các file còn lại (giữ đúng thứ tự)
      if (!await loadOne(src)) {
        // Đang triển khai (file tạm trả HTML lỗi) → chờ 1,5 s, thử lại 1 lần, bỏ bộ đệm
        // bản theo mã băm (h/…, scripts/build-hash.mjs) đã gỡ ở lần deploy mới (trang mở từ trước) → file gốc cùng đường dẫn
        const plain = src.replace(UNHASH, '$1$2');
        if (plain !== src && await loadOne(plain)) return;
        await new Promise(r => setTimeout(r, 1500)); await loadOne(plain + (plain.includes('?') ? '&' : '?') + 'r=' + Date.now());
      }
    }
    const m = src.match(/^js\/i18n\/en\/([^/]+)\.js$/);
    if (m && window.I18N) { const l = I18N.lang(); if (l !== 'en' && l !== 'vi') await loadOne(m[1] === 'pathn' ? App.pathnPack[l] : `js/i18n/${l}/${m[1]}.js`); }
  };
  // Tải song song nhưng chạy đúng thứ tự (async=false); file thiếu được bỏ qua
  // i18nx: chuỗi giao diện của các trang tải lười (TOEFL, Giải đấu, Call Ama & Carlos, Chuyển dữ liệu, Cấu trúc câu) – ra khỏi en.js (khung app),
  // nạp kèm (song song) gói đầu tiên được mở → module luôn vẽ khi đã có bản dịch; tiếng Việt (ngôn ngữ gốc) không cần
  let inflight = 0; // số gói đang tải – tải sẵn (prefetchAll) chờ về 0 để không giành băng thông với trang đang mở
  // CSS riêng của gói (ngoài khung app): nạp song song với JS, chờ xong (tối đa 1,5 s) → không nháy bố cục
  const BCSS = { vhub: 'css/st-v2-vocab-hub.css', outcome: 'css/outcomes.css', welcome: self.matchMedia && matchMedia('(min-width:1024px)').matches ? 'css/st-v2-welcome-desk.css' : 'css/st-v2-welcome.css', onb: ['css/st-v2-onb-pre.css', 'css/st-v2-onb-goal.css', 'css/st-v2-onb-level.css', 'css/st-v2-onb-target.css', 'css/st-v2-onb-pace.css', 'css/st-v2-onb-ready.css'], watch: 'css/watch.css', say: ['css/st-v2-say-front.css', 'css/st-v2-say-back.css'], pas: ['css/st-v2-speak-pre.css', 'css/st-v2-pas-sit.css', 'css/st-v2-pas-drill.css'], mock: 'css/exam.css', toeic: 'css/exam.css', toefl: 'css/exam.css', cambridge: 'css/exam.css', readings: 'css/exam.css', listening: 'css/exam.css', settings: 'css/adm.css', league: 'css/league.css', lesson: ['css/tactile-x.css', 'css/st-lesson.css', 'css/st-v2-lesson-question.css', 'css/st-v2-feedback-correct.css', 'css/st-v2-feedback-wrong.css', 'css/st-v2-lesson-complete.css', 'css/st-v2-story-duo.css'], espr: ['css/tactile-x.css', 'css/st-lesson.css', 'css/st-v2-lesson-question.css', 'css/st-v2-feedback-correct.css', 'css/st-v2-feedback-wrong.css', 'css/st-v2-lesson-complete.css'], goal: ['css/tactile-x.css', 'css/st-goal.css'], call: ['css/st-v2-teacher-call.css'], ux1: ['css/st-home.css', 'css/st-v2-ux1-pre.css', 'css/st-v2-path.css', 'css/st-v2-today.css'] /* Home lần đầu chỉ Lộ trình + Hôm nay; màn khác tải theo màn (st/v2/runtime.js LZ) */ }, cssP = {}; // st-*.css: màn Stitch biên dịch sẵn (scripts/build-stitch-css.mjs)
  const loadCss = h => cssP[h] || (cssP[h] = new Promise(res => { const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = h; l.onload = () => res(); l.onerror = () => { const p = h.replace(UNHASH, '$1$2'); if (p !== h && l.getAttribute('href') === h) l.href = p; else res(); }; setTimeout(res, 1500); document.head.appendChild(l); }));
  App.loadCss = loadCss; App.lean = () => lean(); // ST2.mount: CSS màn v2 tải theo màn (st/v2/runtime.js LZ)
  // gói ux1: Hôm nay mở đầu → chỉ CSS Lộ trình + Hôm nay (size-budget routeGz.ux1); trang đầu là tab khác / máy tính / người mới → nạp luôn CSS màn đó
  //   cùng gói (được chờ trước khi vẽ: không nháy, không ẩn khung). Màn còn lại: st/v2/runtime.js tải theo màn + nạp lúc rảnh.
  const UX1X = () => { if (n0x) return []; n0x = 1; const home = /^#?\/?(home|today|learn|dashboard|lesson)?([?/]|$)/.test(location.hash), x = [];
    if (!home) x.push('review', 'practice', 'leagues', 'me', 'streak', 'exam-readiness'); if (matchMedia('(min-width: 1024px)').matches) x.push('today-desk', 'today-rail');
    if (home && !((state.game || {}).xp > 0)) x.push('today-new'); return x.map(k => `css/st-v2-${k}.css`); };
  let n0x = 0;
  const LZCSS = n => /^(ux1|i18nx|i18nl)$/.test(n) ? [] : ['css/lazy-ui.css']; // CSS trang lười tách khỏi style.css (scripts/test/css-lazy.mjs) – ux1 vẽ ngay nên không chờ
  const need1 = n => bundleP[n] || (inflight++, bundleP[n] = Promise.all(BUNDLES[n].map(loadScript).concat([].concat(BCSS[n] || [], n === 'ux1' ? UX1X() : [], LZCSS(n)).map(loadCss))).finally(() => { inflight--; }));
  App.need = (...names) => Promise.all([...(window.I18N && I18N.lang() !== 'vi' ? ['i18nx', 'i18nl'].map(need1) : []), ...names.map(need1)]);
  App.loaded = n => !!bundleP[n];
  App.loadScript = src => Promise.all([loadScript(src), loadCss('css/lazy-ui.css')]).then(() => {}); // 1 tệp lười theo nhu cầu (vd. tình huống Play & Speak)
  App.anki = async (tab, opts) => { try { await App.need('anki'); if (!window.AnkiUI) throw new Error('anki'); await AnkiUI.open(tab, opts || {}); } catch (e) { toast(t('Không tải được – thử lại sau')); } };
  const ankiAll = () => ({ cards: Object.values(state.cards), name: t('Sổ từ') });
  App.settingsDeps = { applyTheme, importData, ankiAll, extCta: () => extCta() }; // trang Cài đặt (js/settings.js, tải lười) dùng lại
  const lazyUI = (b, f) => App.need(...b).then(f).catch(() => toast(t('Không tải được – thử lại sau')));
  App.xport = o => lazyUI(['anki', 'xport'], () => Export.open(o));
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-share]'); if (b) { e.preventDefault(); lazyUI(['share'], () => ShareCard.open(b.dataset.share)); } });
  // Rảnh thì tải trước các module còn lại → chuyển trang tức thì, dùng offline được
  const idle = cb => ('requestIdleCallback' in window ? requestIdleCallback(cb, { timeout: 4000 }) : setTimeout(cb, 2500));
  // Tải sẵn lúc rảnh – bỏ qua khi tiết kiệm dữ liệu, mạng chậm, máy yếu
  const lean = () => { const c = navigator.connection || {}; return !!c.saveData || /(^|-)2g|3g/.test(c.effectiveType || '') || (navigator.deviceMemory && navigator.deviceMemory <= 2); };
  // Lần vẽ đầu: việc phụ chờ mốc này (docs/UX-PUBLIC.md §LCP)
  let drawnRes; App.painted = new Promise(r => { drawnRes = r; setTimeout(r, 8000); });
  const afterPaint = cb => { let d = 0; const f = () => { if (!d) { d = 1; cb(); } }; requestAnimationFrame(() => setTimeout(f, 0)); setTimeout(f, 1000); };
  // Tải sẵn mọi gói vào bộ đệm trình duyệt KHÔNG thực thi (<link rel=prefetch>, ưu tiên thấp) → trang đầu không bị khựng,
  // vào trang khác thì gói đã có sẵn, chỉ còn bước thực thi.
  // Chỉ bắt đầu khi trang đã tải xong (load) và không còn gói nào đang tải; xếp hàng 3 file một lúc (200+ file cùng lúc làm 4G chậm nghẽn gói của trang kế tiếp – mobile-qa LCP)
  App.prefetchAll = () => { if (!Store.isExtension && lean()) return; const go = () => (inflight || document.readyState !== 'complete' ? setTimeout(go, 700) : idle(() => { const have = new Set([...document.querySelectorAll('script[src],link[rel=prefetch]')].map(x => x.getAttribute('src') || x.getAttribute('href'))); const q = [...new Set(Object.values(BUNDLES).flat())].filter(f => typeof f === 'string' && /\.js$/.test(f) && !have.has(f)); const next = () => { if (inflight) return setTimeout(next, 700); const f = q.shift(); if (!f) return; const l = document.createElement('link'); l.rel = 'prefetch'; l.as = 'script'; l.href = f; l.onload = l.onerror = next; document.head.appendChild(l); }; for (let i = 0; i < 3; i++) next(); })); App.painted.then(() => setTimeout(go, 2500)); };


  // Làm mới phiên âm của thẻ lưu từ bản cũ (trước khi chọn IPA theo từ loại): chạy ngầm lúc rảnh, chậm rãi, mỗi thẻ 1 lần
  const IPA_V = 6; // 6: IPA Mỹ theo kho
  App.refreshIPA = () => refreshIPA();
  async function refreshIPA() {
    if (!navigator.onLine || !window.Dict) return;
    const map = await Cards.all(), todo = Object.values(map).filter(x => x.word && !x.tl && (x.ipaV || 0) < IPA_V).slice(0, 150);
    for (const card of todo) {
      if (!navigator.onLine || document.hidden) break;
      const w = card.word, lib0 = window.Lex ? ((await Lex.get(w).catch(() => null)) || {}).entry : window.IELTS_DATA && IELTS_DATA.INDEX[w.toLowerCase()];
      const lib = lib0 && lib0.word.toLowerCase() === w.toLowerCase() && (!card.pos || !lib0.pos || card.pos === lib0.pos) ? lib0 : null;
      let ipa = '', ipaUS = '', fromLib = false;
      if (lib && lib.ipa) { ipa = lib.ipa; ipaUS = lib.ipaUS || ''; fromLib = true; }
      else if (!/\s/.test(w)) {
        const d = await Dict.quick(w).catch(() => null);
        // chỉ cập nhật khi cùng từ loại (tránh đổi nhầm từ đồng tự khác âm: record n./v.)
        if (d && d.found && d.ipa && (!card.pos || !d.pos || card.pos === d.pos)) { ipa = d.ipa; ipaUS = d.ipaUS || ''; }
        await new Promise(r => setTimeout(r, 900));
      }
      await Cards.patch(w, x => { x.ipaV = IPA_V; if (ipa) { x.ipa = ipa; if (ipaUS || fromLib) x.ipaUS = ipaUS; } }, 'en');
    }
  }

  let routeSeq = 0;
  // Nút ✕/Quay lại trong bài luyện: về đúng trang vừa đứng
  let backHash = '';
  App.backHref = () => backHash || '#/practice';
  let curHash = '';
  // Đổi trang lúc dữ liệu đầu đang nạp → chờ nạp xong mới vẽ (state.game = null)
  let dataReady; const dataReadyP = new Promise(r => { dataReady = r; });
  // Token điều hướng: mỗi lần route() tăng 1 NGAY khi vào hàm (trước mọi await). Mọi bước bất đồng bộ (nạp gói lười, fetch, vẽ muộn)
  // so token của mình với App.routeToken(); cũ hơn = đã có lượt điều hướng mới → bỏ, không vẽ đè trang mới / phiên học đang chạy.
  let scope = { id: 0, ac: new AbortController() };
  App.routeToken = () => routeSeq;
  App.routeStale = tok => tok !== routeSeq;
  // Lượt vẽ gần nhất đã xong (token + hash): test/công cụ chờ trang ổn định bằng tín hiệu thật thay vì đoán thời gian
  let drawn = { tok: 0, hash: '' };
  App.drawn = () => drawn;
  // Trang đang có phiên làm dở (vd. 🧭 kiểm tra đầu vào đã bấm Bắt đầu) gọi App.holdRoute() → lần vẽ lại lúc khởi động xong (boot) không xóa tiến độ.
  // Mỗi lượt route() mới tự bỏ cờ (người học tự điều hướng = rời phiên).
  let held = false;
  App.holdRoute = () => { held = true; };
  App.routeHeld = () => held || document.body.classList.contains('focus');
  App.signal = () => scope.ac.signal; // AbortSignal của trang hiện tại: fetch(url, { signal: App.signal() }) → tự hủy khi đổi trang
  // Nạp gói lười cho trang đang mở: đã sang trang khác → lời hứa treo, không vẽ đè
  App.lazy = (...names) => { const tok = routeSeq, pending = new Promise(() => {}); return App.need(...names).then(v => (tok !== routeSeq ? pending : v), e => (tok !== routeSeq ? pending : Promise.reject(e))); };
  // Bọc một tác vụ bất đồng bộ của trang: kết quả về muộn (trang đã đổi) → bỏ. const tok = App.routeToken(); … if (App.routeStale(tok)) return;
  App.live = p => { const tok = routeSeq, pending = new Promise(() => {}); return Promise.resolve(p).then(v => (tok !== routeSeq ? pending : v), e => (tok !== routeSeq ? pending : Promise.reject(e))); };
  // App.guard(fn): bọc MỘT LẦN cho trang bất đồng bộ. Trong fn: const w = App.W (đọc ngay đầu hàm, trước await đầu tiên); await w(lời_hứa) → trang đã đổi thì lời hứa không bao giờ
  // hoàn tất (không vẽ đè); w.signal cho fetch; w.stale() kiểm tra trước khi ghi DOM.
  App.guard = fn => function (...a) {
    const tok = routeSeq, w = p => Promise.resolve(p).then(v => (tok !== routeSeq ? new Promise(() => {}) : v), e => (tok !== routeSeq ? new Promise(() => {}) : Promise.reject(e)));
    w.signal = scope.ac.signal; w.stale = () => tok !== routeSeq; App.W = w;
    return fn.apply(this, a);
  };
  // Kho từ không cần cho lần vẽ đầu màn này: nạp sau khi vẽ (LCP, late-insert.mjs)
  const softOf = (name, arg, q) => {
    if (name === 'review') return q.get('hub') || q.get('src') ? [] : ['words'];
    if (name !== 'practice' || !arg) return [];
    const src = q.get('src') || 'deck', m = /^topic:(.+)/.exec(src), tp = m && topicOf(m[1]);
    return (m ? tp && tp.words && tp.words.length : /^(deck|due|weak|forgetting|phrases)$/.test(src)) ? ['words', 'tsl'] : [];
  };
  const V2_ROUTES = new Set(['train', 'me', 'say', 'goal']);
  // 🧈 Cuộn: docs/PERF-SCROLL.md
  const Scroll = (() => {
    const de = document.documentElement, pos = new Map(); let off = 0, seq = 0, cur = '', inputAt = 0, movedAt = 0;
    try { history.scrollRestoration = 'manual'; } catch (e) { /* bỏ qua */ }
    const still = () => { off = 0; de.classList.remove('lk-scrolling'); };
    addEventListener('scroll', () => { movedAt = performance.now(); if (off) clearTimeout(off); else de.classList.add('lk-scrolling'); off = setTimeout(still, 160); }, { passive: true });
    const input = () => { inputAt = performance.now(); };
    for (const k of ['touchstart', 'touchmove', 'wheel']) addEventListener(k, input, { passive: true });
    return {
      since: t0 => inputAt > t0,
      enter() { const st = history.state; let id = st && st.lkS, y = 0; if (cur) pos.set(cur, scrollY); if (id) { if (id !== cur) y = pos.get(id) || 0; } else { id = Date.now().toString(36) + (++seq); try { history.replaceState(Object.assign({}, st, { lkS: id }), ''); } catch (e) { /* bỏ qua */ } } cur = id; return y; },
      restore(y, live) { const t0 = performance.now(), go = () => { if (!live() || inputAt > t0 || performance.now() - t0 > 600) return; if (Math.abs(scrollY - y) > 1) scrollTo(0, y); requestAnimationFrame(go); }; go(); },
      calm(fn, maxMs = 20000) { const t0 = performance.now(), go = () => { const n = performance.now(); if (n - t0 > maxMs || (n - Math.max(movedAt, inputAt) > 600)) idle(fn); else setTimeout(go, 400); }; go(); },
    };
  })();
  App.calm = Scroll.calm;
  async function route() {
    const my = ++routeSeq; // token của lượt này
    const backY = Scroll.enter(), routeAt = performance.now();
    held = false;
    scope.ac.abort(); scope = { id: my, ac: new AbortController() };
    if (!state.game) { await dataReadyP; if (my !== routeSeq) return; }
    const { name, arg, query } = parseHash();
    if (name === 'welcome' && welcomeGate(arg)) return; // đã có dữ liệu → thay bằng trang đúng, không tải gói trang giới thiệu
    const STUDY = /^#\/(practice\/|review)/;
    if (STUDY.test(location.hash) && curHash && !STUDY.test(curHash)) backHash = /^#\/welcome/.test(curHash) ? '#/home' : curHash;
    else if (!STUDY.test(location.hash)) backHash = '';
    App.prevHash = curHash; curHash = location.hash;
    const b = [].concat(ROUTE_BUNDLE[name] || []), ux1 = App.ux1On(), sf = softOf(name, arg, query); if (name === 'welcome' && arg === 'setup') b.length = 0; // thiết lập không cần gói trang giới thiệu
    if (sf.length) { sf.forEach(x => { const i = b.indexOf(x); if (i >= 0) b.splice(i, 1); }); if (name === 'practice') b.push('dist'); }
    // Vẽ trước, kho từ sau: Hôm nay/Ôn vẽ bằng dữ liệu cơ bản (data.js + thẻ của người học); gói 'words' (~311 KB nén) nạp sau lần vẽ đầu – LCP khách cũ 5,4 → docs/PERF-SCROLL.md › Tải trang
    const late = PAINT_FIRST.has(name) ? b.filter(x => PAINT_LATE.has(x) && !App.loaded(x)) : [];
    if (late.length) b.splice(0, b.length, ...b.filter(x => !late.includes(x)));
    if (ux1) b.unshift('ux1'); // 🧭 cờ ux1: 5 tab + bản đồ – gói nạp trước mọi trang (lần sau tức thì)
    // Khung màn đặt NGAY lúc chạm: docs/PERF-SCROLL.md
    const reviewHub = ux1 && name === 'review' && query.get('hub') === '1';
    document.body.classList.toggle('focus', !reviewHub && (name === 'review' || (name === 'lesson' && !(ux1 && arg !== 'go')) || (name === 'practice' && !!arg) || !!(window.ExitGuard && ExitGuard.focusFor(name, arg, query.toString())))); document.documentElement.classList.remove('lk-fo'); // màn học mở thẳng từ link: gỡ lớp ẩn khung của script đầu trang (data-lkf) khi route() đã đặt focus
    document.body.classList.toggle('v2pre', ux1 && (reviewHub || V2_ROUTES.has(name) || (name === 'lesson' && !!arg) || (name === 'league' && !!state.user)));
    try { localStorage.setItem('lk.ux1c', ux1 ? '1' : '0'); } catch (e) { /* bỏ qua */ }
    if (!ux1) document.body.classList.remove('ux1');
    if (name !== 'welcome') document.body.classList.remove('bare'); // thanh trên hiện ngay lúc chạm (CLS #/home)
    // Khung chờ (skeleton) chỉ hiện khi tải lâu hơn 150 ms → không nháy màn hình khi tải nhanh
    let skel = null;
    if (b.some(x => !App.loaded(x)) && !document.getElementById('lkHero')) skel = setTimeout(() => { // khung chào #lkHero đang hiện (LCP): không thay bằng khung chờ
      const skelReview = `<div class="study-wrap skel-study" aria-busy="true" aria-label="${t('Đang tải…')}"><div class="study-top"><div class="skel" style="width:32px;height:32px;border-radius:50%"></div><div class="skel" style="flex:1;height:12px;border-radius:6px"></div><div class="skel" style="width:70px;height:14px;border-radius:4px"></div></div><div class="skel-card-body"><div class="skel" style="width:45%;height:2.4rem;border-radius:10px"></div><div class="skel" style="width:30%;height:1.2rem;border-radius:6px"></div><div class="skel" style="width:75%;height:1.2rem;border-radius:6px;margin-top:.4rem"></div><div class="skel" style="width:85%;height:1rem;border-radius:6px"></div><div class="row center" style="gap:.8rem;width:100%;max-width:320px;margin-top:1.2rem"><div class="skel" style="height:44px;flex:1;border-radius:999px"></div><div class="skel" style="height:44px;flex:1;border-radius:999px"></div></div></div></div>`;
      const skelHome = `<div class="skel-page skel-home" aria-busy="true" aria-label="${t('Đang tải…')}"><div class="today-head"><div class="skel" style="width:52px;height:52px;border-radius:50%;flex:none"></div><div class="grow" style="display:grid;gap:.5rem"><div class="skel skel-h" style="width:40%;height:1rem"></div><div class="skel skel-l" style="width:75%;height:1.3rem"></div></div><div class="skel" style="width:88px;height:34px;border-radius:999px;flex:none"></div></div><div class="skel" style="height:110px;border-radius:18px"></div><div class="skel" style="height:150px;border-radius:18px"></div><div class="skel" style="height:130px;border-radius:18px"></div></div>`;
      const skelDefault = `<div class="skel-page" aria-busy="true" aria-label="${t('Đang tải…')}"><div class="skel skel-h"></div><div class="skel skel-l"></div><div class="skel-grid">${'<div class="skel skel-card"></div>'.repeat(4)}</div></div>`;
      view.innerHTML = name === 'review' ? skelReview : name === 'home' || !name ? skelHome : skelDefault;
    }, 150);
    if (b.length) { try { await App.need(...b); } catch (e) { if (my === routeSeq) errState(); throw e; } finally { clearTimeout(skel); } if (my !== routeSeq) return; }
    if (ux1 && window.Ux1) Ux1.init();
    if (!routes[name] && ROUTE_ALIAS[name]) { location.replace(location.pathname + location.search + '#/' + [ROUTE_ALIAS[name], arg && encodeURIComponent(arg)].filter(Boolean).join('/') + (query.toString() ? '?' + query : '')); return; } // gõ nhầm quen thuộc (#/wellcom…) → trang đúng
    const fn = routes[name] || (name ? notFound : routes.home);
    // Đánh dấu mục đang mở: thanh dưới theo 5 mục chính, menu bên theo mục con; nhóm chứa trang hiện tại tự mở
    const [tab, item] = App.navOf ? App.navOf(name, arg) : [name, name];
    $$('#bnav a').forEach(a => { const on = a.dataset.tab === tab; a.classList.toggle('active', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); });
    $$('#nav a[data-route]').forEach(a => { const on = a.dataset.route === item; a.classList.toggle('active', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); });
    $$('#nav .nav-group').forEach(gp => { const on = gp.dataset.tab === tab; gp.classList.toggle('current', on); if (on) gp.open = true; });
    setTimeout(() => { const on = document.querySelector('#nav a.active'); if (on && on.offsetParent) on.scrollIntoView({ block: 'nearest' }); }, 230); // màn thấp: mục đang chọn không khuất trong vùng cuộn menu (chờ nhóm mở xong)
    UI.stopSpeak(); UI.clearRecs();
    document.onkeydown = null;
    if (App.cleanup) { try { App.cleanup(); } catch (e) { /* bỏ qua */ } App.cleanup = null; }
    while (App.cleanups.length) { try { App.cleanups.pop()(); } catch (e) { /* một hàm lỗi không chặn các hàm khác */ } }
    // Chuyển trang mượt (View Transitions – Chrome/Edge/Safari mới); máy cũ: hiệu ứng mờ dần sẵn có
    const render = async () => {
      if (!backY && !Scroll.since(routeAt)) window.scrollTo(0, 0); const preTitle = document.title;
      // Đường dẫn "Kỹ năng › Nghe" ở đầu trang con → luôn biết mình đang ở đâu, 1 chạm quay lại trang trung tâm.
      const crumb = () => { const c = my === routeSeq && App.crumb && App.crumb(name, arg), ph = c && view.querySelector('.page-head'); if (ph && !ph.querySelector('.crumb')) ph.insertAdjacentHTML('afterbegin', c); };
      const mo = new MutationObserver(crumb); mo.observe(view, { childList: true });
      try { await fn(arg, query); } catch (e) { if (my !== routeSeq || (e && e.name === 'AbortError')) return; if (!view.querySelector(':scope > :not(.skel-page):not(.skel-study)')) errState(); throw e; } finally { mo.disconnect(); } // lượt cũ lỗi vì bị hủy → im lặng
      crumb(); // trang vẽ .page-head sau bước bất đồng bộ
      setTimeout(() => { if (my === routeSeq) document.body.classList.remove('v2pre'); }, 1500);
      if (backY && my === routeSeq) Scroll.restore(backY, () => my === routeSeq);
      if (late.length) App.calm(() => App.need(...late).catch(() => {}), 2500); // sau lần vẽ đầu (kể cả khi đã sang trang khác: gói dùng chung)
      if (my === routeSeq) { drawn = { tok: my, hash: location.hash }; markActivity(name, arg); a11yRoute(name, preTitle); if (App.afterRoute) App.afterRoute(name); if (drawnRes) { const r = drawnRes; drawnRes = null; afterPaint(() => { r(); dispatchEvent(new Event('lk:drawn')); }); } }
      if (sf.length) afterPaint(() => idle(() => App.need(...sf).then(() => dispatchEvent(new Event('lk:soft'))).catch(() => {})));
    };
    // Không dùng View Transitions (Chrome vẽ lệch ảnh trang cũ khi Quay lại).
    // Chỉ hiệu ứng mờ-trồi nhẹ bằng CSS trên #view – mượt, không bao giờ vẽ sai.
    view.style.animation = 'none'; void view.offsetWidth; view.style.animation = '';
    render();
  }
  App.route = route;
  // Đổi trang (SPA) cho trình đọc màn hình: tiêu đề tab theo h1 của trang + đưa focus về vùng nội dung khi bấm từ thanh điều hướng
  // (không cướp focus của hộp thoại/ô nhập; lần mở đầu tiên giữ nguyên). Kiểu Babbel/Duolingo web: Tab tiếp theo vào thẳng nội dung trang.
  let titleBase = '', routedOnce = false;
  function a11yRoute(name, preTitle) {
    try {
      if (document.title !== preTitle) { if (!titleBase) titleBase = preTitle; } else { // trang tự đặt tiêu đề riêng (vd. Cách dùng từ) → giữ
      const h = name && name !== 'home' && view.querySelector('.page-head h1, h1');
      const txt = h ? h.textContent.replace(/^[\p{Extended_Pictographic}\uFE0F\u200d\s]+/u, '').replace(/\s+/g, ' ').trim().slice(0, 70) : '';
      if (txt) { if (!titleBase) titleBase = document.title; document.title = txt + ' – Lexkite'; } else if (titleBase) document.title = titleBase;
      }
      const a = document.activeElement, modalOpen = !!document.querySelector('#modal:not([hidden])');
      if (routedOnce && !modalOpen && (!a || a === document.body || (a.closest && a.closest('#bnav, #nav, .side-foot, .crumb')))) view.focus({ preventScroll: true });
      routedOnce = true;
    } catch (e) { /* không chặn việc vẽ trang */ }
  }
  // Khả năng truy cập: nút loa/nghe chỉ có biểu tượng → tự gắn nhãn "Nghe: <từ>" cho trình đọc màn hình (kể cả nút sinh sau)
  const SAY = '[data-speak],[data-saysent],[data-say],[data-speak-text],[data-slow]';
  const labelSay = root => root.querySelectorAll && root.querySelectorAll(SAY).forEach(b => {
    if (b.getAttribute('aria-label') || b.getAttribute('title')) return;
    const w = b.dataset.speak || b.dataset.saysent || b.dataset.say || b.dataset.speakText || b.dataset.slow || '';
    b.setAttribute('aria-label', (b.dataset.slow ? t('Nghe chậm') : t('Nghe')) + (w ? ': ' + w.slice(0, 80) : ''));
  });
  // RTL (ar): mũi tên chỉ hướng ở ĐẦU/CUỐI nút & liên kết ("Bắt đầu →", "← Quay lại") lật theo hướng đọc; mũi tên giữa câu (en → vi) giữ nguyên
  const rtlArrows = root => {
    if (document.documentElement.dir !== 'rtl' || !root.querySelectorAll) return;
    const els = root.matches && root.matches('a, button') ? [root] : root.querySelectorAll('a, button');
    for (const el of els) { const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { const v = n.nodeValue, nv = v.replace(/\s→\s*$/, ' ←').replace(/^(\s*)←\s/, '$1→ '); if (nv !== v) n.nodeValue = nv; } }
  };
  if (window.MutationObserver) new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) { if (n.matches && n.matches(SAY)) labelSay(n.parentNode || n); else labelSay(n); rtlArrows(n.closest && n.closest('a, button') || n); } }).observe(view, { childList: true, subtree: true });
  // Bài đang học dở (nghe, đọc, viết, ngữ pháp, nói, đề thi…) → khối "Tiếp tục" ở trang Hôm nay mở lại bằng 1 chạm
  const RESUME = { listen: 'headphones', read: 'newspaper', write: 'pen-line', task1: 'trending-up', letters: 'mail', grammar: 'ruler', speaking: 'message-circle', 'toefl-p': 'landmark', 'toeic-r': 'briefcase', 'toeic-test': 'briefcase', 'listen-test': 'headphones', model: 'file-text', pron: 'audio-lines', cbt: 'monitor', ideas: 'lightbulb' };
  function markActivity(name, arg) {
    if (!RESUME[name] || !arg || arg === 'mix') return;
    const h = view.querySelector('.page-head h1, h1, h2'); const title = h ? h.textContent.replace(/\s+/g, ' ').trim().slice(0, 90) : '';
    if (!title) return;
    try { localStorage.setItem('vb.lastActivity', JSON.stringify({ em: RESUME[name], title, href: location.hash, at: Date.now(), lang: I18N.lang() })); } catch (e) { /* bỏ qua */ }
  }
  App.lastActivity = () => { try { const a = JSON.parse(localStorage.getItem('vb.lastActivity') || 'null'); return a && Date.now() - a.at < 4 * DAY && (a.lang || 'vi') === I18N.lang() ? a : null; /* tiêu đề lưu theo ngôn ngữ lúc học → đổi ngôn ngữ thì không hiện chữ cũ */ } catch (e) { return null; } };
  // Bí danh/gõ nhầm hay gặp → chuyển thẳng (không hiện trang lỗi). Tên khác lạ → trang "Không tìm thấy" kèm gợi ý gần đúng nhất.
  const ROUTE_ALIAS = { wellcom: 'welcome', welcom: 'welcome', wellcome: 'welcome', welcomme: 'welcome', start: 'welcome', setup: 'welcome', onboarding: 'welcome', signup: 'welcome', login: 'me', signin: 'me', account: 'me', profile: 'me', hom: 'home', homepage: 'home', today: 'home', dashboard: 'home', learn: 'home', app: 'home', index: 'home', reveiw: 'review', reivew: 'review', revew: 'review', revise: 'review', flashcards: 'review', flashcard: 'review', dictionary: 'dict', lookup: 'dict', search: 'dict', test: 'tests', exam: 'tests', exams: 'tests', setting: 'settings', vocabulary: 'vocab', words: 'vocab', stat: 'stats', progress: 'stats', mistake: 'mistakes', leagues: 'league', grammer: 'grammar', pronunciation: 'pron', contacts: 'contact' };
  const lev = (a, b) => { const d = Array.from({ length: b.length + 1 }, (_, i) => i); for (let i = 1; i <= a.length; i++) { let p = d[0]; d[0] = i; for (let j = 1; j <= b.length; j++) { const q = d[j]; d[j] = Math.min(d[j] + 1, d[j - 1] + 1, p + (a[i - 1] === b[j - 1] ? 0 : 1)); p = q; } } return d[b.length]; };
  App.ROUTE_ALIAS = ROUTE_ALIAS;
  // Trang không tải được (mất mạng / gói lỗi / hàm vẽ lỗi): thông báo thân thiện + nút chính "Thử lại" + lối về Hôm nay, thay cho màn trống hoặc khung chờ treo
  // reload: Thử lại = tải lại trang (file gói thiếu không tải lại được bằng route; bộ định tuyến chưa chạy) · dead: app chưa khởi động xong → không có lối về
  function errState(reload, dead) {
    const off = !navigator.onLine;
    view.innerHTML = `<div class="card err-state" role="alert"><span class="err-ic">${UI.icon(off ? 'globe' : 'compass')}</span><h1>${t('Không tải được – thử lại sau')}</h1>${off ? `<p class="muted">${t('Mất kết nối – vẫn ôn tập được, tra từ mới cần mạng')}</p>` : ''}<div class="row center"><button class="btn primary" data-retry>${t('Thử lại')}</button>${dead ? '' : `<a class="btn" href="#/home">${t('Hôm nay')}</a>`}</div></div>`;
    const r = view.querySelector('[data-retry]'); if (r) r.onclick = () => (reload === true ? location.reload() : route());
  }
  function notFound() {
    const { name } = parseHash(), n = String(name || '').toLowerCase().slice(0, 30);
    const near = n.length > 2 ? Object.keys(routes).filter(r => r !== 'welcome' && Math.abs(r.length - n.length) <= 2).map(r => [r, lev(n, r)]).filter(x => x[1] <= Math.max(1, Math.floor(n.length / 4))).sort((a, b) => a[1] - b[1])[0] : null;
    view.innerHTML = `<div class="card empty-note" style="max-width:560px;margin:2rem auto;text-align:center"><div style="font-size:2.4rem">${UI.icon('compass')}</div><h1 style="margin:.3rem 0">${t('Không tìm thấy trang')}</h1><p class="muted">${t('Liên kết có thể đã cũ. Chọn một mục bên dưới để tiếp tục học.')}</p>
      ${near ? `<p><a class="btn primary sm" href="#/${near[0]}">${t('Có phải bạn muốn mở:')} #/${near[0]}</a></p>` : ''}
      <div class="row center" style="flex-wrap:wrap">${[['home', 'house', t('Hôm nay')], ['vocab', 'library', t('Từ vựng')], ['skills', 'target', t('Kỹ năng')], ['tests', 'flag', t('Thi thử')], ['me', 'user', t('Tôi')]].map(([r, ic, l]) => `<a class="btn sm" href="#/${r}">${UI.icon(ic)} ${l}</a>`).join('')}</div></div>`;
  }
  // Tải trước gói của trang khi người dùng sắp bấm (rê chuột/chạm vào liên kết) → mở trang gần như tức thì
  const prefetchFor = a => { const h = a && a.getAttribute && a.getAttribute('href'); if (!h || !h.startsWith('#/')) return; const n = h.slice(2).split(/[/?]/)[0]; const b = [].concat(ROUTE_BUNDLE[n] || []); if (b.some(x => !App.loaded(x))) App.need(...b).catch(() => {}); };
  ['pointerdown', 'mouseover', 'focusin'].forEach(ev => document.addEventListener(ev, e => prefetchFor(e.target.closest && e.target.closest('a[href^="#/"]')), { passive: true }));
  // Ghi chú học từ soạn sẵn (AI tầng T0 – không cần mạng/khóa): mẹo nhớ, lỗi người Việt hay mắc, cách dùng khi thi, họ từ.
  // Chia theo chữ cái đầu (js/notes/a.json…) → chỉ tải phần cần; chỗ hiển thị là ô trống được điền khi dữ liệu về.
  const notesCache = {};
  const notesFile = w => { const c = /^[a-z]/.test(w) ? w[0] : '_'; return notesCache[c] || (notesCache[c] = fetch(`js/notes/${c}.json`).then(r => r.ok ? r.json() : {}).catch(() => { delete notesCache[c]; return {}; })); };
  // 🧩 Bài học trộn (cờ lesson_mix: config công khai true/false; thử: localStorage lk.lesson=1; demo #/lesson?demo=1 luôn mở – docs/LESSON-ENGINE.md)
  // 🧭 UX1 "Một app duy nhất" (cờ ux1, mặc định TẮT – docs/LEARNING-PATH.md): 5 tab, trang chủ = bản đồ, Luyện gom mọi tính năng. Thử: localStorage lk.ux1=1 · xem trước 1 phiên: #/home?ux1=1
  // Bật dần (như ret, docs/LEARNING-PATH.md §Phát hành): config ux1 '0' tắt khẩn / '1' bật hết > ux1_pct: nhóm lk.ub (0–99 ngẫu nhiên, cố định theo máy, tách lk.rb của ret) < ux1_pct (trống/0 = tắt). Chốt 1 lần/lượt tải trang → không đổi giao diện giữa chừng
  // Đo D1/D7: App.ux1Arm() 'on' | 'off' (đối chứng cùng cỡ: lk.ub ∈ [50, 50+pct)) | '' → ux1Track gửi 1 lần/máy seen, d1 (chuỗi ≥ 2), d7 (chuỗi ≥ 7) → ext_events 'ux1:ux1_<arm>_<ev>' (functions/api/hit.js UX1_EV)
  const ux1Cfg = () => { try { return JSON.parse(localStorage.getItem('lk.cfg') || '{}').v || {}; } catch (e) { return {}; } };
  const ux1B = () => { try { let b = localStorage.getItem('lk.ub'); if (b == null || isNaN(+b) || +b < 0 || +b > 99) { b = String(Math.floor(Math.random() * 100)); localStorage.setItem('lk.ub', b); } return +b; } catch (e) { return 99; } };
  const ux1All = v => v === true || v === '1' || v === 'true', ux1Off = v => v === false || v === '0' || v === 'false';
  App.ux1Arm = () => { const c = ux1Cfg(), p = +c.ux1_pct; if (ux1All(c.ux1) || ux1Off(c.ux1) || !(p > 0 && p <= 50)) return ''; const b = ux1B(); return b < p ? 'on' : b >= 50 && b < 50 + p ? 'off' : ''; };
  let ux1R = null; // kết quả cờ từ config, chốt theo lượt tải trang
  const ux1Remote = () => { if (ux1R == null) { const c = ux1Cfg(), p = +c.ux1_pct; ux1R = ux1Off(c.ux1) ? false : ux1All(c.ux1) ? true : p > 0 && ux1B() < p; } return ux1R; };
  App.ux1On = () => { try { if (/[?&]ux1=1\b/.test(location.search + location.hash)) sessionStorage.setItem('lk.ux1.pv', '1'); if (sessionStorage.getItem('lk.ux1.pv') === '1') return true; const f = localStorage.getItem('lk.ux1'); if (f === '1' || f === '0') return f === '1'; return ux1Remote(); } catch (e) { return false; } };
  App.ux1Track = st => { try { const a = App.ux1Arm(); if (!a || localStorage.getItem('lk.noTrack') === '1') return; const go = (k, ev) => { if (localStorage.getItem(k)) return; localStorage.setItem(k, '1'); const u = (/(^|\.)lexkite\.(com|pages\.dev)$/.test(location.hostname) ? '' : 'https://lexkite.com') + '/api/hit', d = JSON.stringify({ t: 'q', ev }); navigator.sendBeacon ? navigator.sendBeacon(u, d) : fetch(u, { method: 'POST', body: d, keepalive: true, mode: 'no-cors' }).catch(() => {}); }; go('lk.ux', 'ux1_' + a + '_seen'); if (st >= 2) go('lk.ud1', 'ux1_' + a + '_d1'); if (st >= 7) go('lk.ud7', 'ux1_' + a + '_d7'); } catch (e) { /* bỏ qua */ } };
  App.updateChrome = () => updateChrome();
  App.lessonOn = () => { if (App.ux1On()) return true; try { const f = localStorage.getItem('lk.lesson'); if (f === '1' || f === '0') return f === '1'; const c = JSON.parse(localStorage.getItem('lk.cfg') || 'null'), v = c && c.v && c.v.lesson_mix; return v === true || v === '1' || v === 'true'; } catch (e) { return false; } };
  // 🖼️ Ảnh minh họa theo nghĩa (cờ vocab_img: true/false ghi đè, chưa đặt = TỰ ĐỘNG bật khi chỉ mục có ≥ 150 ảnh đã chấm; thử: localStorage lk.vimg=1 – docs/LEXICON.md § Ảnh minh họa). Tắt → không tải gì, không hộp.
  // Bật → tải trước module + chỉ mục lúc mở app; App.vimg() đồng bộ chỉ trả hộp cố định khi chỉ mục đã về và nghĩa có ảnh (CLS 0).
  const vimgOn = () => { try { const f = localStorage.getItem('lk.vimg'); if (f === '1' || f === '0') return f === '1'; const c = JSON.parse(localStorage.getItem('lk.cfg') || 'null'), v = c && c.v && c.v.vocab_img; if (v === false || v === '0' || v === 'false') return false; if (localStorage.getItem('lk.vimg.adm') === '1' || v === '1' || v === true) return true; const p = c && c.v && c.v.vocab_img_pct, pct = p != null && p !== '' && !isNaN(+p) ? +p : 10, b = localStorage.getItem('lk.vb'); return b == null || +b < pct; } catch (e) { return false; } };   // bật dần: nhóm lk.vb < vocab_img_pct (mặc định 10 %) – module tự quyết lần đầu (tạo lk.vb)   // chưa đặt = tự động: module + chỉ mục nhỏ tự quyết (on ≥ 150 ảnh)
  App.vimgReady = list => (vimgOn() ? App.need('vimg').then(() => window.VImg && VImg.ready(list)).catch(() => null) : Promise.resolve(null));
  App.vimg = (word, pos, gloss, w, ex) => (window.VImg ? VImg.slot(word, pos, gloss, w, ex) : ''); // w = vai (card|back|quiz|dict|words) hoặc px; ex = câu ví dụ (ảnh cảnh)
  // Màn đầu (chào/trang chủ, lần tải lạnh): hoãn nạp module+chỉ mục ảnh tới lúc rảnh – chạy lúc khởi động nó chặn luồng chính ~100 ms (TBT mobile). Màn khác (học/ôn/tra từ): nạp ngay như cũ để thẻ đầu đã có ảnh.
  /^#?\/?(welcome|home)?\/?(\?|$)/.test(location.hash) ? idle(() => App.vimgReady()) : App.vimgReady();
  // thẻ ngôn ngữ đích khác: chỉ ảnh có khóa tiếng Anh từ#loại khớp ĐÚNG nghĩa (trường img, content/target/<tl>/) – không có → không ảnh
  App.imgKey = c => (c.tl ? String(c.img || '').split('#') : [c.word, c.pos]); // [từ, loại] để gọi App.vimg; thẻ tl không có img → người gọi bỏ ảnh
  // Khối "Hiểu sâu": HTML đã dựng nhớ theo từ → lần vẽ lại (từ điển: bản nhanh → bản đủ) vẽ luôn trong cùng lần, không chèn muộn đẩy nội dung bên dưới (CLS 0,66 #/dict @360)
  const notesMem = new Map(), notesP = {};
  App.notesReady = word => { const w = String(word || '').toLowerCase(); if (notesMem.has(w)) return Promise.resolve(notesMem.get(w)); return notesP[w] || (notesP[w] = Promise.all([notesFile(w), App.need('wordcard').then(() => window.WordCard && WordCard.ready)]).then(([m]) => { const n = Object.hasOwn(m, w) && m[w], h = n && window.WordCard ? WordCard.notes(n, w) : ''; notesMem.set(w, h); return h; }).catch(() => { delete notesP[w]; return ''; })); };
  App.notesHtml = word => { const w = String(word || '').toLowerCase(), h = notesMem.get(w); return h != null ? `<div class="wn-slot" data-notes="${esc(w)}" data-done="1">${h}</div>` : `<div class="wn-slot" data-notes="${esc(w)}"></div>`; };
  const fillNotes = () => document.querySelectorAll('.wn-slot[data-notes]:not([data-done])').forEach(el => { el.dataset.done = 1; App.notesReady(el.dataset.notes).then(h => { if (h && el.isConnected) el.innerHTML = h; }); });
  // Chip cụm từ/đồng nghĩa/họ từ: chạm = nghe · chạm lần 2 (hoặc giữ) = tra nghĩa tại chỗ (đang học) / mở từ điển
  App.chipsHtml = (list, icon, label) => (list || []).length ? `<div class="wc-chips"><span class="wc-clb">${icon} ${label}</span>${list.map(x => `<button type="button" class="chip wc-chip" data-wc-say="${esc(x)}" title="${t('Chạm để nghe · chạm lần nữa để tra nghĩa')}"><span lang="en">${esc(x)}</span></button>`).join('')}</div>` : '';
  { let last = null, at = 0, lp = 0, held = false;
    const look = b => { const w = b.dataset.wcSay; if (App.phrasePop && b.closest('.study-wrap')) App.phrasePop(b, { phrase: w }); else location.hash = '#/dict/' + encodeURIComponent(w); };
    document.addEventListener('pointerdown', e => { const b = e.target.closest && e.target.closest('[data-wc-say]'); clearTimeout(lp); held = false; if (b) lp = setTimeout(() => { held = true; look(b); }, 550); });
    ['pointerup', 'pointercancel'].forEach(ev => document.addEventListener(ev, () => clearTimeout(lp)));
    document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-wc-say]'); if (!b) return; e.preventDefault(); if (held) { held = false; return; } if (last === b && Date.now() - at < 5000) { last = null; return look(b); } last = b; at = Date.now(); speak(b.dataset.wcSay, state.settings.accent); });
  }
  new MutationObserver(() => fillNotes()).observe(view, { childList: true, subtree: true });
  // Gợi ý giọng đọc hay hơn (miễn phí) khi máy chỉ có giọng "robot" – theo đúng hệ điều hành/trình duyệt
  App.voiceTipHtml = accent => {
      const v = UI.pickVoice(accent || state.settings.accent), good = v && /Natural|Neural|Online|^Google|Premium|Enhanced|Siri/i.test(v.name);
      if (good || !('speechSynthesis' in window) || !speechSynthesis.getVoices().length) return '';
      const ua = navigator.userAgent, win = /Windows/.test(ua), apple = /Mac|iPhone|iPad/.test(ua), android = /Android/.test(ua), edge = /Edg\//.test(ua);
      return '🎧 ' + (win && !edge ? t('Giọng hiện tại chưa tự nhiên. Mở Lexkite bằng <b>Microsoft Edge</b> để dùng giọng <b>Natural</b> (rất giống người thật, miễn phí).')
        : apple ? t('Tải giọng chất lượng cao miễn phí: <b>Cài đặt → Trợ năng → Nội dung được đọc → Giọng nói → English</b> → chọn giọng có chữ <b>Nâng cao/Premium</b>, rồi mở lại Lexkite.')
        : android ? t('Cài <b>Google Speech Services</b> (Dịch vụ giọng nói của Google) từ CH Play và tải giọng tiếng Anh chất lượng cao để nghe tự nhiên hơn.')
        : t('Dùng Chrome hoặc Edge mới nhất để có giọng đọc tự nhiên hơn.'));
  };
  // Gói nghĩa dịch sẵn theo ngôn ngữ giao diện (web/packs/<lang>.json – scripts/gen-word-packs.mjs, GitHub Action hằng đêm):
  // nghĩa tiếng mẹ đẻ hiện tức thì & offline; từ chưa có trong gói mới dịch lúc chạy.
  // Nghĩa hiển thị DUY NHẤT cho mọi danh sách/thẻ: tiếng Việt chỉ khi người học chọn nghĩa tiếng Việt;
  // ngôn ngữ khác → nghĩa tiếng mẹ đẻ dịch sẵn (gói) → định nghĩa tiếng Anh. Không bao giờ rơi về tiếng Việt.
  App.meanOf = x => { if (!x) return ''; if (x.gl) return x.gl[I18N.meanLang()] || x.gl.en || x.def || ''; /* thẻ ngôn ngữ đích khác: nghĩa 15 ngôn ngữ đi kèm thẻ */ if (I18N.meanLang() === 'vi') return x.vi || x.def || ''; return (I18N.lang() !== 'en' && App.nativeGloss && App.nativeGloss(x.word, x.pos)) || x.def || ''; };
  // Nội dung soạn tiếng Việt ở giao diện ≠ vi – không bao giờ hiện tiếng Việt (docs/I18N-PIPELINE.md §2.6)
  App.viHtml = (vi, en) => { const L = I18N.learnLang(); if (!vi || L === 'vi') return esc(vi || en || ''); if (L === 'en' && en) return `<span lang="en">${esc(en)}</span>`; return `<span class="tr-wait"${en ? ` data-en="${esc(en)}"` : ''}>${esc(vi)}</span>`; };
  // Dọn dẹp khi rời trang: nhiều module có thể đăng ký (App.onCleanup(fn)); App.cleanup (1 hàm) vẫn được hỗ trợ
  App.cleanups = []; App.onCleanup = fn => { if (typeof fn === 'function') App.cleanups.push(fn); };
  App.packs = {};
  // Gói: "từ"/"từ#loại" → [nghĩa, cờ, tin cậy] (docs/LEXICON.md); tin cậy 1 → nhãn "Dịch máy"
  const gpos = p => { p = String(p || '').toLowerCase(); return /^(n|noun)\b/.test(p) ? 'n' : /^(phr ?v|phrasal)/.test(p) ? 'phrv' : /^(v|verb)\b/.test(p) ? 'v' : /^adj/.test(p) ? 'adj' : /^adv/.test(p) ? 'adv' : p; };
  App.glossEntry = (w, pos) => { const p = App.packs[I18N.lang()], k = String(w || '').toLowerCase(); return (p && ((pos && p[k + '#' + gpos(pos)]) || p[k])) || null; };
  App.nativeGloss = (w, pos) => { const e = App.glossEntry(w, pos); return e ? e[0] : ''; };
  // Nghĩa tiếng mẹ đẻ: gói → dịch lúc chạy
  App.nativeFill = (el, word, pos) => { const L = I18N.lang(); if (!el || L === 'vi' || L === 'en' || I18N.meanLang() === 'vi') return; el.lang = L; el.dir = 'auto'; const pk = App.nativeGloss(word, pos); if (pk) { const ge = App.glossEntry(word, pos); el.textContent = '🌐 ' + pk; if (ge && ge[2] === 1) { const m = document.createElement('span'); m.className = 'muted small'; m.textContent = ' · ' + t('Dịch máy'); el.appendChild(m); } return; } const viaLex = window.Lex ? Lex.get(word, { lang: L }).then(r => (r && r.mean && r.entry.word.toLowerCase() === String(word).toLowerCase() ? r.mean : null)).catch(() => null) : Promise.resolve(null); // mảnh ~1,5 KB, không cả gói
    viaLex.then(m => m || App.loadPack().then(() => App.glossEntry(word, pos))).then(ge => (ge ? ge : window.Dict ? Dict.translateTo(word, L).then(r => (r ? [r, 0, 0] : null)) : null)).then(ge => { const r = ge && ge[0]; if (r && r.toLowerCase() !== word.toLowerCase() && el.isConnected) { el.textContent = '🌐 ' + r; if (ge[2] === 1) { const m = document.createElement('span'); m.className = 'muted small'; m.textContent = ' · ' + t('Dịch máy'); el.appendChild(m); } } }).catch(() => {}); };
  App.loadPack = () => {
    const L = I18N.lang(); if (L === 'vi' || L === 'en' || App.packs[L]) return Promise.resolve(App.packs[L]);
    const base = /(^|\.)lexkite\.(com|pages\.dev)$/.test(location.hostname) ? '' : 'https://lexkite.com';
    App._pack = App._pack || {}; // theo từng ngôn ngữ
    return (App._pack[L] = App._pack[L] || fetch(base + '/packs/' + L + '.json').then(r => (r.ok ? r.json() : {})).then(j => (App.packs[L] = j)).catch(() => { delete App._pack[L]; return {}; }));
  };
  setTimeout(() => App.loadPack(), 1500);
  // Nội dung bài học viết bằng tiếng Việt → tự dịch sang ngôn ngữ người học khi giao diện không phải tiếng Việt.
  // Dịch theo lô (Google Translate miễn phí), lưu bộ nhớ đệm trên máy → lần sau hiện ngay. Không dịch nghĩa từ (.vi) và dữ liệu người học nhập.
  (function contentTranslate() {
    const to = I18N.learnLang(); if (to === 'vi' || !window.MutationObserver) return;
    const VI = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
    // Không dịch vùng học & làm bài (phương án trắc nghiệm, thẻ, câu hỏi) – tránh lộ đáp án; tên ngôn ngữ giữ nguyên tiếng gốc (translate="no")
    const SKIP = '.vi, .svi, .ctxvi, .gap-vi, [data-keep-vi], input, textarea, script, style, code, .entry-word, .study-wrap, .options, .option, .flash, .lq-group, .toeic-u, .mk-qs, .sheet, [translate="no"]';
    const KEY = 'vb.cx.' + to; let mem = {}; try { mem = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { mem = {}; }
    const save = () => { try { const ks = Object.keys(mem); if (ks.length > 4000) ks.slice(0, ks.length - 4000).forEach(k => delete mem[k]); localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* đầy bộ nhớ */ } };
    let timer = 0, busy = false, again = false;
    // Bản dịch SẴN do CI tạo (scripts/gen-content-i18n.mjs, CDN) → hiện ngay đúng ngôn ngữ; chỉ câu chưa có mới dịch máy lúc chạy
    let pre = null; const preP = fetch((/(^|\.)lexkite\.(com|pages\.dev)$/.test(location.hostname) || (window.VBNative && VBNative.is) ? '' : 'https://lexkite.com') + '/i18n/content/' + to + '.json') // app gốc: file nằm sẵn trong gói (www/i18n/content) → dùng được khi offline
      .then(r => (r.ok ? r.json() : {})).catch(() => ({})).then(j => { pre = j || {}; setTimeout(pass, 0); }); // về muộn (> 1,5 s, mạng chậm) → dịch lại trang đang mở
    const got = k => mem[k] || (pre && pre[k]) || ''; // bản dịch sẵn không ghi vào localStorage (giữ bộ nhớ máy nhẹ)
    const ok = n => { const s = n.nodeValue.trim().replace(/\s+/g, ' '); return s.length > 1 && VI.test(s) && (!n.parentElement.closest(SKIP) || n.parentElement.closest('.wn, [translate="yes"]')); }; /* ghi chú từ (.wn) luôn được dịch cho người học quốc tế */
    const put = x => { const s = x.nodeValue.trim().replace(/\s+/g, ' '); if (!got(s)) return false; const m = x.nodeValue.match(/^\s*/)[0], e = x.nodeValue.match(/\s*$/)[0]; x.nodeValue = m + got(s) + e; return true; };
    const unwait = root => [root, ...root.querySelectorAll('.wn.wn-tr, .tr-wait')].forEach(el => { if (el.matches('.wn.wn-tr, .tr-wait') && !VI.test(el.textContent)) el.classList.remove('wn-tr', 'tr-wait'); });
    // Chỗ vừa chèn mà đã có bản dịch (bộ nhớ đệm / bản sẵn) → thay NGAY trong lúc DOM đổi (trước khi trình duyệt vẽ):
    // vẽ lại trang không chớp tiếng Việt 120 ms, nghĩa chờ dịch (.tr-wait) hiện liền thay vì chờ lượt pass sau
    const apply = a => {
      if (!a.isConnected) return;
      if (a.nodeType === 3) { if (a.parentElement && ok(a) && put(a)) unwait(a.parentElement.closest('.wn.wn-tr, .tr-wait') || a.parentElement); return; }
      if (a.nodeType !== 1) return;
      const tw = document.createTreeWalker(a, NodeFilter.SHOW_TEXT); let n, hit = false;
      while ((n = tw.nextNode())) if (ok(n) && put(n)) hit = true;
      if (hit) unwait(a);
    };
    // Chữ sắp hiện (vd. nghĩa cụm từ ở #/dict, biết ngay từ lần vẽ nhanh) → dịch trước, lần vẽ đủ dùng bản dịch có sẵn
    const want = new Set();
    App.cxWant = list => { (list || []).forEach(x => { const s = String(x || '').trim().replace(/\s+/g, ' '); if (s.length > 1 && VI.test(s) && !got(s)) want.add(s); }); if (want.size) setTimeout(pass, 0); };
    async function pass() {
      if (busy) { again = true; return; } busy = true;
      try {
        if (!pre) await Promise.race([preP, new Promise(r => setTimeout(r, 1500))]);
        const nodes = [], tw = document.createTreeWalker(view, NodeFilter.SHOW_TEXT); let n;
        while ((n = tw.nextNode())) if (ok(n)) nodes.push(n);
        const need = [...want].filter(s => !got(s)); let failed = false; want.clear();
        // Thuộc tính hiển thị (tooltip, nhãn trợ năng, gợi ý ô nhập) cũng phải theo ngôn ngữ người dùng
        const attrs = []; view.querySelectorAll('[title],[aria-label],[placeholder]').forEach(el => { if (el.closest(SKIP) && !el.matches('input,textarea')) return; ['title', 'aria-label', 'placeholder'].forEach(a => { const v = el.getAttribute(a); if (v && VI.test(v)) attrs.push([el, a, v.trim()]); }); });
        attrs.forEach(([el, a, v]) => { if (got(v)) el.setAttribute(a, got(v)); else if (!need.includes(v)) need.push(v); });
        nodes.forEach(x => { if (!put(x)) { const s = x.nodeValue.trim().replace(/\s+/g, ' '); if (!need.includes(s)) need.push(s); } });
        for (let i = 0; i < need.length;) { // lô ≤ 1800 ký tự
          const batch = []; let len = 0; while (i < need.length && len + need[i].length < 1800) { batch.push(need[i]); len += need[i].length + 1; i++; } if (!batch.length) batch.push(need[i++]);
          const r = await fetch(`${Dict.gtxURL('vi', to)}&dt=t&q=${encodeURIComponent(batch.join('\n'))}`, { signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined }).then(x => (x.ok ? x.json() : (x.body && x.body.cancel().catch(() => {}), null))).catch(() => null);
          if (!r || !r[0]) { failed = true; break; }
          const out = r[0].map(x => x[0]).join('').split('\n');
          batch.forEach((s, k) => { if (out[k] && out[k].trim()) mem[s] = out[k].trim(); });
        }
        if (need.length) { save(); nodes.forEach(put); attrs.forEach(([el, a, v]) => { if (got(v)) el.setAttribute(a, got(v)); }); }
        // Ghi chú học từ (soạn tiếng Việt): chỉ hiện khi đã dịch hết sang ngôn ngữ người học – không lộ tiếng Việt khi dịch chậm/lỗi
        unwait(view);
        // dịch hỏng → tiếng Anh viết tay (data-en)
        if (failed) view.querySelectorAll('.tr-wait[data-en]').forEach(el => { el.textContent = el.dataset.en; el.lang = 'en'; el.classList.remove('tr-wait'); });
        view.querySelectorAll('.an-ch:not([data-gl])').forEach(ch => { const g = ch.querySelector('.an-gl'); if (g && !g.classList.contains('tr-wait')) ch.dataset.gl = g.textContent; });
      } finally { busy = false; if (again) { again = false; setTimeout(pass, 0); } }
    }
    // Gom thay đổi DOM ≤ 120 ms rồi dịch – hẹn giờ KHÔNG dời lại theo mỗi thay đổi: trang vẽ dần/đổi liên tục (khối điền muộn, hoạt ảnh)
    // từng làm lượt dịch bị hoãn mãi, chữ tiếng Việt (hoặc ô .tr-wait trống) nằm đó lâu hơn hẳn 120 ms
    new MutationObserver(ms => { for (const m of ms) m.addedNodes.forEach(apply); if (!timer) timer = setTimeout(() => { timer = 0; pass(); }, 120); }).observe(view, { childList: true, subtree: true, characterData: false });
  })();
  document.addEventListener('change', e => { if (e.target.matches && e.target.matches('[data-whisper]')) { state.settings.whisperMode = e.target.checked; saveSettings(); if (e.target.checked) toast(t('Hãy đeo tai nghe và nói thì thầm vào micro – không làm phiền người xung quanh.'), 4500); } });
  window.addEventListener('hashchange', route);
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href^="#/"]');
    if (a && !e.defaultPrevented && a.getAttribute('href') === location.hash) { e.preventDefault(); route(); } // đã có bộ nghe khác nhận (vd avatar #/me mở menu tài khoản ngay trên trang Tôi) → không vẽ lại trang (đóng mất menu)
  });

  // ---------- Tìm kiếm toàn cục + gợi ý ----------
  (function search() {
    const input = $('#gq'), box = $('#suggest');
    if (input && matchMedia('(max-width: 600px)').matches) { input.setAttribute('data-i18n-placeholder', 'Tra từ…'); input.placeholder = 'Tra từ…'; } // màn hẹp: bỏ gợi ý phím tắt (không có bàn phím) để chữ không bị cắt
    input.setAttribute('data-i18n-aria-label', 'Tra từ'); input.setAttribute('aria-label', 'Tra từ'); // khóa gốc – I18N.apply() dịch khi từ điển sẵn sàng (đừng gọi t() lúc nạp module)
    let items = [], idx = -1, timer = null, seq = 0;
    const render = () => {
      box.hidden = !items.length;
      box.innerHTML = items.map((it, i) => `<a href="#/dict/${encodeURIComponent(it.word)}" class="${i === idx ? 'on' : ''}">${it.local ? '📗' : '🔎'} <b>${esc(it.word)}</b><span class="vi">${esc(it.vi || '')}</span></a>`).join('');
    };
    const go = w => { ++seq; items = []; box.hidden = true; input.value = ''; input.blur(); location.hash = `#/dict/${encodeURIComponent(w)}`; };
    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      clearTimeout(timer); idx = -1;
      if (!q) { items = []; ++seq; return render(); }
      const my = ++seq; App.typedAt = Date.now();
      const mine = window.Lex ? Lex.suggest(q, 6).then(r => r.map(x => ({ word: x.word, vi: App.meanOf(x.entry), local: true }))).catch(() => [])
        : Promise.resolve(Object.keys(INDEX).filter(k => k.startsWith(q)).slice(0, 6).map(k => ({ word: INDEX[k].word, vi: App.meanOf(INDEX[k]), local: true })));
      mine.then(local => { if (my !== seq) return; items = [...local, ...items.filter(i => !i.local && !local.some(l => l.word === i.word) && i.word.startsWith(q))].slice(0, 8); render(); }); // kết quả cũ về sau không đè
      timer = setTimeout(async () => {
        try {
          const r = await Dict.dm(`sug?s=${encodeURIComponent(q)}&max=8`);
          if (!r || my !== seq) return;
          await mine; if (my !== seq) return;
          const extra = r.map(x => x.word).filter(w => /^[a-z][a-z' -]*$/.test(w) && !items.some(i => i.word === w)).slice(0, 8 - items.length).map(w => ({ word: w, vi: INDEX[w] ? App.meanOf(INDEX[w]) : '' }));
          items = [...items, ...extra]; render();
        } catch (e) { /* offline */ }
      }, 180);
    });
    input.addEventListener('focus', () => { if (window.Lex) Lex.warm().catch(() => {}); }, { once: true });
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown') { idx = Math.min(items.length - 1, idx + 1); render(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { idx = Math.max(-1, idx - 1); render(); e.preventDefault(); }
      else if (e.key === 'Enter') { const w = idx >= 0 ? items[idx].word : input.value.trim(); if (w) go(w); }
      else if (e.key === 'Escape') { box.hidden = true; input.blur(); }
    });
    input.addEventListener('blur', () => setTimeout(() => { box.hidden = true; }, 150));
    box.addEventListener('mousedown', e => { const a = e.target.closest('a'); if (a) { e.preventDefault(); go(decodeURIComponent(a.getAttribute('href').split('/').pop())); } });
    document.addEventListener('keydown', e => {
      if (e.key === '/' && !e.target.matches('input, textarea, select')) { e.preventDefault(); input.focus(); }
    });
  })();

  // ================= TRANG CHỦ =================
  const readHtml = r => r ? `<div class="section-title"><h2>${t('Bài đọc hôm nay')}</h2><a href="#/reading">${t('Tất cả bài đọc →')}</a></div>
      <a class="card hover row nowrap" href="#/read/${r.id}" style="color:var(--text)">
        <div style="font-size:2.4rem">${r.emoji}</div>
        <div class="grow"><div class="row"><h3 style="margin:0">${esc(r.title)}</h3>${levelChip(r.level)}</div><div class="muted small">${App.viHtml(r.summaryVi, r.summaryEn)}</div></div>
        <span class="btn sm">${t('Đọc →')}</span></a>` : '';
  // ================= HÔM NAY: 4 khối – chào + mục tiêu · kế hoạch hôm nay (1 nút chính) · từ của ngày · quảng cáo =================
  // ⭕ 3 vòng mục tiêu ngày (kiểu Activity Rings): ôn FSRS · từ mới · luyện nói. Đủ 3 vòng → pháo hoa + 50 XP (1 lần/ngày)
  function ringsData() {
    const k = todayKey(), gd = (state.game && state.game.days && state.game.days[k]) || {}, st = state.settings;
    const nw = state.stats.newToday && state.stats.newToday.day === k ? state.stats.newToday.n : 0;
    return [
      { id: 'rev', v: state.stats.days[k] || 0, max: st.dailyGoal || 20, color: '#1F7A72', label: t('Ôn thẻ'), href: '#/review' },
      { id: 'new', v: nw, max: st.dailyNew || 10, color: '#CC3F1C', label: t('Từ mới'), href: '#/practice/learn' },
      { id: 'say', v: gd.spoken || 0, max: 5, color: '#8b6fd6', label: t('Luyện nói'), href: '#/speaking' },
    ];
  }
  function ringsHtml() {
    const R = ringsData(), C = [44, 34, 24];
    const svg = `<svg class="rings" viewBox="0 0 100 100" role="img" aria-label="${esc(R.map(r => `${r.label} ${Math.min(r.v, r.max)}/${r.max}`).join(', '))}">${R.map((r, i) => { const L = 2 * Math.PI * C[i], f = Math.min(1, r.v / r.max); return `<circle cx="50" cy="50" r="${C[i]}" class="ring-bg" style="stroke:${r.color}"/><circle cx="50" cy="50" r="${C[i]}" class="ring-fg${f >= 1 ? ' full' : ''}" style="stroke:${r.color};stroke-dasharray:${L};stroke-dashoffset:${L * (1 - f)}"/>`; }).join('')}</svg>`;
    return `<section class="card rings-card">${svg}<div class="rings-legend">${R.map(r => `<a href="${r.href}"><i style="background:${r.color}"></i><span>${r.label}</span><b>${Math.min(r.v, r.max)}/${r.max}${r.v >= r.max ? ' ✓' : ''}</b></a>`).join('')}</div></section>`;
  }
  async function ringsReward() {
    const k = todayKey(), gd = (state.game.days || {})[k] || {};
    if (gd.rings || !ringsData().every(r => r.v >= r.max)) return;
    state.game = await Game.mutate(gs => { gs.days[k] = gs.days[k] || {}; gs.days[k].rings = 1; });
    App.reward({ xp: 50 }); Sfx.win(); confetti(180); toast(`⭕ ${t('Đủ 3 vòng mục tiêu hôm nay! +50 XP')}`, 4000);
  }
  routes.home = function () {
    if (App.lessonOn() && !/[?&]all=1\b/.test(location.hash)) return App.need('lesson').then(() => routes.lesson()); // 🧩 cờ lesson_mix: trang chủ = bản đồ chặng (1 nút Bắt đầu); trang chủ đầy đủ ở #/home?all=1
    const k = todayKey(), now = new Date(), h = now.getHours();
    const cards = Object.values(state.cards);
    const todayReviews = state.stats.days[k] || 0;
    const greet = h < 11 ? t('Chào buổi sáng') : h < 18 ? t('Chào buổi chiều') : t('Chào buổi tối');
    const name = state.user ? (state.user.displayName || '').split(' ').pop() : '';
    const ex = App.exam ? App.exam() : 'ielts', X = (App.EXAMS || {})[ex] || { ic: 'graduation-cap', short: 'IELTS' };
    const g = state.settings.goal;
    const left = g && g.date ? Math.ceil((new Date(g.date) - now) / DAY) : null;
    const chip = g && g.target ? `<a class="goal-chip" href="#/goal">${UI.icon(X.ic)} ${esc(X.short)} ${esc(g.exam === 'general' ? ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'][g.target - 1] || '' : String(g.target))}${left > 0 ? ' · ' + t('còn {n} ngày', { n: left }) : ''}</a>` : `<a class="goal-chip" href="#/goal">🚩 ${t('Đặt mục tiêu')}</a>`;
    const late = h >= 19 && !todayReviews && cards.length;
    const seed = allWords(), w = seed[Math.floor(Date.now() / DAY) % seed.length];
    const quests = Game.questsFor(k), doneQ = state.game.questsDone[k] || [];
    setTimeout(() => ringsReward().catch(() => {}), 800);
    view.innerHTML = `
      <div class="today-head">
        ${window.Kit ? Kit.svg(late ? 'sad' : 'happy', 52) : ''}
        <div class="grow"><div class="muted small">${greet}${name ? ', ' + esc(name) : ''}</div><div class="kit-say" id="kitSay">${late ? t('Học 5 phút với mình để giữ chuỗi nhé!') : t('Đây là kế hoạch của bạn hôm nay')}</div></div>
        ${chip}
      </div>
      <section class="card today-card home-hero" id="todayPlan" aria-busy="true"><div class="skel skel-l"></div><div class="skel skel-l"></div><div class="skel skel-l"></div></section>
      <h2 class="home-more-h">${t('Thêm cho hôm nay')}</h2>
      <div class="home-more">
        <div class="home-col">${ringsHtml()}<a class="card hover quest-card" href="#/stats?s=quests"><span class="qc-h"><span class="qc-t">${UI.icon('medal')} ${t('Nhiệm vụ hôm nay')}</span><span class="chip${doneQ.length === quests.length ? ' ok' : ''}">${doneQ.length}/${quests.length}</span><span class="chev" aria-hidden="true">›</span></span>${quests.map(q => { const v = Math.min(q.goal, (state.game.days[k] || {})[q.metric] || 0), ok = doneQ.includes(q.id); return `<span class="qc-it${ok ? ' done' : ''}"><span class="qc-ic" aria-hidden="true">${UI.glyph(ok ? 'circle-check' : q.icon)}</span><span class="qc-tx">${esc(q.text)}</span><span class="qc-n">${v}/${q.goal}</span><span class="progress thin xp qc-bar" aria-hidden="true"><i style="width:${v / q.goal * 100}%"></i></span></span>`; }).join('')}</a><div id="leagueHomeCard"></div></div>
        <div class="home-col">
          ${App.lessonOn() ? `<a class="card hover hub-card" href="#/lesson"><span class="hub-ic" aria-hidden="true">${UI.icon('sparkles')}</span><span class="hub-tx"><b>${t('Bài học trộn')}</b><small>${t('Nghe · nói · xếp câu từ chính các từ của bạn')}</small></span><span class="chev" aria-hidden="true">›</span></a>` : ''}
          <a class="card hover hub-card quick-play-card" href="#/quick"><span class="hub-ic" aria-hidden="true">${UI.icon('zap')}</span><span class="hub-tx"><b>${t('Chơi nhanh 15 giây')}</b><small>${t('4 câu cực ngắn · Không sợ sai, giữ phản xạ')}</small></span><span class="chip ok">${t('Chơi ngay')} →</span></a>
          <a class="card hover hub-card" href="#/confidence"><span class="hub-ic" aria-hidden="true">${UI.icon('message-circle')}</span><span class="hub-tx"><b>${t('Giao tiếp tự tin')}</b><small>${t('Nói tự tin trong tình huống thật · 5–8 phút/bài')}</small></span><span class="chev" aria-hidden="true">›</span></a>
          <div class="card wotd wotd-sm">
            ${pic(w)}
            <div>
              <div class="tiny muted" style="font-weight:700;text-transform:uppercase;letter-spacing:.06em">${t('Từ của ngày')}</div>
              <div class="row"><a class="wotd-w" href="#/dict/${encodeURIComponent(w.word)}" style="font-size:1.3rem;font-weight:800;color:var(--text)">${esc(w.word)}</a>${posChip(w.pos)}${levelChip(w.level)}<span class="say-pron" lang="en" dir="ltr"><span class="ipa small">${esc(w.ipa)}</span><button class="icon-btn sm" data-speak="${esc(w.word)}" aria-label="${t('Nghe')}">🔊</button></span></div>
              <div class="vi">${esc(App.meanOf(w))}</div>
              <div class="row" style="margin-top:.4rem">${inDeck(w.word) ? `<span class="chip ok">✓ ${t('Đã có trong sổ')}</span>` : `<button class="btn sm" data-add-seed="${esc(w.word)}">+ Flashcard</button>`}</div>
            </div>
          </div>
        </div>
      </div>
      ${window.Ads ? Ads.slot('home') : ''}
    `;
    bindCommon();
    const drawLeague = () => { const el = $('#leagueHomeCard'); if (el && window.League) League.renderHomeCard(el); };
    if (window.League) drawLeague();
    else if (App.need) App.lazy('league').then(drawLeague).catch(() => {});
    if (window.StreakUI) StreakUI.checkSavedNotice(state.game);
    if (App.retOn()) App.lazy('streak', 'ret').then(() => window.Ret && Ret.home()).catch(() => {}); // 🔥 lớp giữ thói quen (docs/RETENTION.md) – sau cờ
    if (App.todayPlan) App.todayPlan().then(tasks => {
      const el = $('#todayPlan'); if (!el) return;
      el.removeAttribute('aria-busy');
      const n = tasks.filter(x => x.done).length, next = tasks.find(x => !x.done), mins = tasks.filter(x => !x.done).reduce((a, x) => a + (x.mins || 0), 0);
      const ra = App.lastActivity(), resume = ra && (!next || ra.href !== next.href) ? `<a class="home-resume small" href="${esc(ra.href)}">${t('Tiếp tục bài đang học')}: <b>${esc(ra.title)}</b> ›</a>` : ''; // bài đang học dở: liên kết phụ trong thẻ chính (trước đây là thẻ riêng tranh nút chính)
      if (!next) {
        el.innerHTML = `<div class="today-done">${window.Kit ? Kit.svg('win', 72, true) : UI.icon('party-popper')}<h2>${t('Xong kế hoạch hôm nay!')} ${UI.icon('party-popper')}</h2><p class="muted">${t('Ngày mai quay lại để giữ chuỗi nhé. Muốn học thêm?')}</p>
          <div class="row center"><a class="btn" href="#/practice">⚡ ${t('Trò chơi từ vựng')}</a><a class="btn" href="#/skills">🎯 ${t('Luyện thêm kỹ năng')}</a></div>${resume}</div>`;
        const ks = $('#kitSay'); if (ks) ks.textContent = t('Xong mục tiêu hôm nay rồi! Giỏi quá 🎉');
        return;
      }
      // Kiểu Duolingo/Busuu: 1 thẻ "Học tiếp" duy nhất nổi bật – 1 nút chính; danh sách việc + bài đang học dở gọn bên dưới (không cạnh tranh nút chính)
      el.innerHTML = `<div class="row between nowrap"><div class="grow"><div class="home-hero-k">${t('Học tiếp')}</div><h2 class="home-hero-t">${esc(next.t)}</h2><div class="muted small">${esc(next.sub || '')}</div></div>${ring(Math.round(n / tasks.length * 100), n + '/' + tasks.length, 'var(--primary)')}</div>
        <a class="btn primary lg block today-cta" href="${next.href}">${next.day ? (next.started ? t('Tiếp tục Ngày {n}', { n: next.day }) : t('Bắt đầu Ngày {n}', { n: next.day })) + (next.track ? ' · ' + esc(next.track) : '') + ' · ≈ ' + t('{m} phút', { m: next.mins }) : n ? t('Tiếp tục: {step}', { step: esc(next.t) }) : t('Bắt đầu: {step}', { step: esc(next.t) })} →</a>${next.sw || ''}${resume}
        <details class="plan-more"><summary>${t('Kế hoạch hôm nay')} · ${t('{a}/{b} việc', { a: n, b: tasks.length })}${mins ? ' · ≈ ' + t('{m} phút', { m: mins }) : ''}</summary>
        <div class="plan">${tasks.map(x => `<a class="plan-item ${x.done ? 'done' : ''} ${x === next ? 'next' : ''}" href="${x.href}"${x === next ? ' aria-current="step"' : ''}><span class="pi-em" aria-hidden="true">${UI.glyph(x.done ? 'circle-check' : x.em)}</span><div class="grow"><b>${esc(x.t)}</b><div class="small muted">${esc(x.sub || '')}</div></div>${x.mins && !x.done ? `<span class="pi-min">${t('{m} phút', { m: x.mins })}</span>` : ''}</a>`).join('')}</div></details>`;
    });
  };

  // Khối thống kê cũ của trang chủ (thời điểm vàng, tuần này, cấp độ nhớ) → js/stats-page.js (gói lười statsp)

  function modeTiles() {
    return [
      ['learn', '🧠', t('Học thông minh'), t('Trắc nghiệm → gõ từ, thích ứng theo bạn'), 'var(--accent-soft)'],
      ['blitz', '⏱️', t('Thử thách 60 giây'), t('Ôn từ đến hạn, combo, thách đấu bạn bè'), 'var(--again-soft)'],
      ['match', '⚡', t('Ghép thẻ'), t('Ghép từ với nghĩa thật nhanh'), 'var(--gold-soft)'],
      ['speak', '🎙️', t('Luyện phát âm'), t('Nói vào micro, chấm điểm ngay'), 'var(--primary-soft)'],
      ['mcq', '🧩', t('Trắc nghiệm'), t('Chọn nghĩa đúng'), 'var(--good-soft)'],
      ['cloze', '✍️', t('Điền từ'), t('Hoàn thành câu IELTS'), 'var(--accent-soft)'],
      ['listen', '🎧', t('Nghe & chép'), t('Nghe phát âm, gõ lại'), 'var(--good-soft)'],
      ['handsfree', '🎧', t('Học rảnh tay'), t('Nghe liên tục, khóa màn hình vẫn học'), 'var(--gold-soft)'],
      ['reflex', '⚡', t('Phản xạ 60 giây'), t('Nghe câu ngắn, nhại lại, chấm từng từ'), 'var(--primary-soft)'],
      ['test', '📝', t('Bài kiểm tra'), t('20 câu tổng hợp, chấm điểm'), 'var(--accent-soft)'],
      ['write', '✍️', t('Phòng viết'), t('Viết Task 2, phân tích từ vựng'), 'var(--gold-soft)'],
      ['speaking', '🗣️', t('Phòng Speaking'), t('Part 1–3, ghi âm, chấm từ vựng'), 'var(--good-soft)'],
      ...(window.Target && Target.enabled('es') ? [['es', '🇪🇸', t('Luyện tiếng Tây Ban Nha'), t('Chia động từ và ngữ pháp, giải thích bằng ngôn ngữ của bạn'), 'var(--gold-soft)'], ['esp', '🇪🇸', t('Luyện phát âm'), t('Nói vào micro, chấm điểm ngay'), 'var(--primary-soft)'], ['esx', '🇪🇸', t('Luyện định dạng DELE/SIELE'), t('Đọc, nghe, viết, nói theo cấu trúc đề thi'), 'var(--gold-soft)']] : []),
    ].map(([id, em, name, desc, bg]) => `<a class="mode" href="${id === 'write' || id === 'speaking' || id === 'handsfree' || id === 'reflex' ? '#/' + id : '#/practice/' + id}"><span class="em" style="background:${bg}">${UI.glyph(em)}</span><b>${name}</b><span class="muted small">${desc}</span></a>`);
  }
  App.modeTiles = modeTiles;

  function topicCard(tp, lvf) {
    const n = tp.words.filter(w => inDeck(w.word)).length;
    const pct = n / tp.words.length * 100;
    const lv = [...new Set(tp.words.map(w => w.level).filter(Boolean))].sort().join(' · ');
    return `<a class="card hover topic-card" href="#/topic/${tp.id}${typeof lvf === 'string' && lvf ? '?lv=' + lvf : ''}" style="color:var(--text)">
      <div class="row between nowrap"><span class="em">${tp.emoji}</span>${ring(pct, `${n}/${tp.words.length}`, pct === 100 ? 'var(--good)' : '')}</div>
      <h3>${esc(tp.name)}</h3>
      <div class="muted small clamp2">${esc(tp.desc)}</div>
      <div class="tiny muted topic-meta">${t('{n} từ', { n: tp.words.length })}${lv ? ' · ' + esc(lv) : ''}</div>
    </a>`;
  }
  App.topicCard = topicCard;

  // ================= THƯ VIỆN =================
  routes.library = function (arg, query) {
    // Mặc định mở đúng nhóm theo kỳ thi; người đang học dở → "Đang học"
    const ex = App.exam ? App.exam() : 'ielts';
    const tab = query.get('g') || (Object.keys(state.cards).length >= 10 ? 'mine' : ({ toeic: 'toeic', toefl: 'exam', general: 'core' })[ex] || 'topics');
    const total = Object.keys(INDEX).length;
    const LV0 = /^[ABC][12]$/.test(query.get('lv') || '') ? query.get('lv') : '';
    view.innerHTML = `
      <div class="page-head"><div><h1>${t('Thư viện từ vựng')}</h1><p class="muted">${t('{n} từ & cụm từ trong {k} bộ – phiên âm Anh–Anh, cấp độ CEFR, collocation và câu ví dụ IELTS.', { n: total.toLocaleString(I18N.lang()), k: TOPICS.length })}</p></div>
        <div class="row"><input class="input" id="libQ" placeholder="${t('Lọc bộ từ…')}" style="max-width:240px"><button class="btn sm" id="libAnkiOut">🃏 ${t('Xuất sang Anki')}</button><button class="btn sm" id="libAnkiIn">🃏 ${t('Nhập từ Anki')}</button></div></div>
      <div class="tabs" id="libTabs">
        <button data-g="all" class="${tab === 'all' ? 'on' : ''}">${t('Tất cả')}</button>
        ${GROUPS.map(g => `<button data-g="${g.id}" class="${tab === g.id ? 'on' : ''}">${g.emoji} ${esc(g.name)}</button>`).join('')}
        <button data-g="mine" class="${tab === 'mine' ? 'on' : ''}">📌 ${t('Đang học')}</button>
      </div>
      <div class="lv-filter" role="group" aria-label="${t('Cấp độ CEFR')}"><span class="small muted">📶 ${t('Cấp độ CEFR')}</span>${['', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => `<button type="button" class="chip${l === LV0 ? ' on' : ''}" data-lvf="${l}" aria-pressed="${l === LV0}">${l || t('Tất cả')}</button>`).join('')}</div>
      <div id="libBody" style="margin-top:1rem"></div>`;
    let lvf = LV0;
    // ≥5 từ (hoặc ≥30%) ở cấp đó
    const hasLv = tp => { if (!lvf) return true; const n = tp.words.filter(w => w.level === lvf).length; return n >= 5 || n >= tp.words.length * 0.3 && n > 0; };
    const draw = () => {
      const q = $('#libQ').value.trim().toLowerCase();
      const g = $('#libTabs .on').dataset.g;
      const match = t => hasLv(t) && (!q || t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q) || t.words.some(w => w.word.toLowerCase() === q));
      const topicCard = tp => App.topicCard(tp, lvf);
      const groups = g === 'all' ? GROUPS : g === 'mine' ? [{ id: 'mine', name: t('Bộ từ đang học'), emoji: '📌', desc: '' }] : GROUPS.filter(x => x.id === g);
      $('#libBody').innerHTML = groups.map(gr => {
        const ts = TOPICS.filter(t => (gr.id === 'mine' ? t.words.some(w => inDeck(w.word)) : t.group === gr.id) && match(t));
        const mineHtml = gr.id === 'mine' ? personalCollections() : '';
        if (!ts.length) return gr.id === 'mine' ? (mineHtml || `<div class="card empty"><div class="em">📌</div>${t('Bạn chưa lưu từ nào. Tra từ, đọc bài hoặc dùng add-on khi xem YouTube để bắt đầu.')}</div>`) : '';
        if (mineHtml) return mineHtml + `<div class="section-title"><h2>📚 ${t('Bộ từ IELTS đang học')}</h2></div><div class="grid auto">${ts.map(topicCard).join('')}</div>`;
        // Tab "Tất cả": mỗi nhóm chỉ 6 bộ đầu + nút xem hết → không bị ngợp
        const cut = g === 'all' && !q && ts.length > 6;
        return `<div class="section-title" style="margin-top:${g === 'all' ? '1.6rem' : '0'}"><h2>${gr.emoji} ${esc(gr.name)}</h2>${cut ? `<a href="#/library?g=${gr.id}" data-go-g="${gr.id}">${t('Xem cả {n} bộ', { n: ts.length })} →</a>` : `<span class="muted small">${esc(gr.desc)}</span>`}</div>
          <div class="grid auto">${(cut ? ts.slice(0, 6) : ts).map(topicCard).join('')}</div>`;
      }).join('') || `<div class="card empty"><div class="em">🔍</div>${t('Không tìm thấy bộ từ phù hợp.')}</div>`;
    };
    const syncUrl = () => history.replaceState(history.state, '', location.pathname + location.search + `#/library?g=${$('#libTabs .on').dataset.g}${lvf ? '&lv=' + lvf : ''}`);
    $$('#libTabs button').forEach(b => b.onclick = () => { $$('#libTabs button').forEach(x => x.classList.toggle('on', x === b)); syncUrl(); draw(); });
    $$('[data-lvf]').forEach(b => b.onclick = () => { lvf = b.dataset.lvf; $$('[data-lvf]').forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-pressed', on); }); syncUrl(); draw(); });
    $('#libQ').oninput = draw;
    $('#libAnkiOut').onclick = () => App.anki('export', ankiAll());
    $('#libAnkiIn').onclick = () => App.anki('import');
    $('#libBody').onclick = e => { const a = e.target.closest('[data-go-g]'); if (!a) return; e.preventDefault(); const b = $(`#libTabs [data-g="${a.dataset.goG}"]`); if (b) { b.click(); b.scrollIntoView({ inline: 'center', block: 'nearest' }); window.scrollTo(0, 0); } };
    if (!$('#libTabs .on')) { const b = $('#libTabs [data-g="topics"]') || $('#libTabs button'); b.classList.add('on'); }
    draw();
  };

  function personalCollections() {
    const groups = {};
    Object.values(state.cards).forEach(c => { const o = origin(c); (groups[o] = groups[o] || []).push(c); });
    const keys = Object.keys(ORIGINS).filter(k => groups[k]);
    if (!keys.length) return '';
    return `<div class="section-title" style="margin-top:0"><h2>📌 ${t('Thư viện của tôi')}</h2><span class="muted small">${t('Tự động phân loại theo nơi bạn gặp từ')}</span></div>
      <div class="grid auto">${keys.map(k => { const list = groups[k]; const m = list.filter(c => SRS.mastery(c.srs) === 3).length; const due = list.filter(c => (c.srs.reps > 0 || c.srs.last) && c.srs.due <= endOfToday()).length; return `
        <a class="card hover topic-card" href="#/deck?from=${k}" style="color:var(--text)">
          <div class="row between nowrap"><span class="em">${ORIGINS[k].emoji}</span>${ring(m / list.length * 100, `${m}/${list.length}`, 'var(--good)')}</div>
          <h3>${ORIGINS[k].name}</h3><div class="muted small">${ORIGINS[k].desc}</div>
          <div class="row"><span class="chip">${t('{n} từ', { n: list.length })}</span>${due ? `<span class="chip lv">🔁 ${t('{n} cần ôn', { n: due })}</span>` : ''}</div></a>`; }).join('')}</div>`;
  }
  App.personalCollections = personalCollections;

  routes.topic = function (id, query) {
    const tp = topicOf(id);
    if (!tp) return routes.library('', new URLSearchParams());
    const levels = [...new Set(tp.words.map(w => w.level).filter(Boolean))].sort();
    const missing = () => tp.words.filter(w => !inDeck(w.word));
    const gname = (GROUPS.find(g => g.id === tp.group) || {}).name || '';
    const q0 = query && query.get && query.get('lv');
    let lv = levels.length > 1 && levels.includes(q0) ? q0 : '';
    view.innerHTML = `
      <a href="#/library?g=${tp.group}" class="small">← ${esc(gname)}</a>
      <div class="card" style="margin:.7rem 0 1rem;display:flex;gap:1.2rem;align-items:center;flex-wrap:wrap">
        <div style="font-size:3rem;width:80px;height:80px;border-radius:22px;display:grid;place-items:center;background:var(--surface-2)">${tp.emoji}</div>
        <div class="grow"><h1 style="margin:0">${esc(tp.name)}</h1><div class="muted">${esc(tp.desc)}</div>
          <div class="row" style="margin-top:.5rem"><span class="chip">${t('{n} từ', { n: tp.words.length })}</span><span class="chip ok" id="tCount"></span></div></div>
        <div class="row">
          <button class="btn primary" id="addAll"></button>
          <a class="btn" href="#/practice/learn?src=topic:${tp.id}">🧠 ${t('Học')}</a>
          <a class="btn" href="#/practice/match?src=topic:${tp.id}">⚡ ${t('Ghép thẻ')}</a>
          <a class="btn" href="#/practice/test?src=topic:${tp.id}">📝 ${t('Kiểm tra')}</a>
          <a class="btn" href="#/handsfree/${tp.id}">🎧 ${t('Nghe rảnh tay')}</a>
          <button class="btn" id="tpAnki">🃏 ${t('Xuất sang Anki')}</button>
        </div>
      </div>
      ${levels.length > 1 ? `<div class="tabs" id="lvTabs" role="group" aria-label="${t('Cấp độ CEFR')}" style="margin-bottom:1rem;display:inline-flex"><button class="${lv ? '' : 'on'}" data-lv="">${t('Tất cả')}</button>${levels.map(l => `<button class="${l === lv ? 'on' : ''}" data-lv="${l}">${l} <span class="muted tiny">${tp.words.filter(w => w.level === l).length}</span></button>`).join('')}</div>` : ''}
      <div class="card" id="wordList"></div>`;
    const header = () => {
      const m = missing().length;
      $('#tCount').textContent = t('{n} đã thêm', { n: tp.words.length - m });
      const b = $('#addAll');
      b.textContent = m ? `+ ${t('Thêm {n} từ vào flashcard', { n: m })}` : `✓ ${t('Đã thêm toàn bộ')}`;
      b.disabled = !m;
    };
    const draw = () => {
      $('#wordList').innerHTML = tp.words.filter(w => !lv || w.level === lv).map(w => `
        <div class="word-row">
          <div class="em">${esc(w.emoji || '📘')}</div>
          <div style="min-width:0">
            <div class="row"><a class="w" href="#/dict/${encodeURIComponent(w.word)}">${esc(w.word)}</a>${posChip(w.pos)}${levelChip(w.level)}
              ${UI.ipaHtml(w, null, { cls: 'ipa small' })}<button class="icon-btn sm" data-speak="${esc(w.word)}" aria-label="${t('Phát âm')}">🔊</button></div>
            <div><b class="vi" style="font-size:1rem">${esc(App.meanOf(w))}</b>${w.def && App.meanOf(w) !== w.def ? ` <span class="muted small">— ${esc(w.def)}</span>` : ''}</div>
            ${w.ex ? `<div class="ex small">“${highlight(w.ex, w.word)}”</div>` : ''}
            ${w.col.length ? `<div class="small" style="margin-top:.2rem">🔗 ${w.col.map(esc).join(' · ')}</div>` : ''}
          </div>
          <div>${inDeck(w.word) ? `<span class="chip ok">✓ ${t('Đã thêm')}</span>` : `<button class="btn sm" data-add-seed="${esc(w.word)}" data-topic="${tp.id}">+ ${t('Thêm')}</button>`}</div>
        </div>`).join('');
      bindCommon(header);
    };
    header(); draw();
    $$('#lvTabs button').forEach(b => b.onclick = () => { $$('#lvTabs button').forEach(x => x.classList.toggle('on', x === b)); lv = b.dataset.lv; draw(); });
    $('#tpAnki').onclick = () => App.anki('export', { cards: tp.words.map(w => state.cards[w.word.toLowerCase()] || w), name: tp.name, progress: false });
    $('#addAll').onclick = async () => {
      const list = missing();
      $('#addAll').disabled = true;
      for (const w of list) await addWord(w, null, { silent: true });
      Sfx.win(); toast(t('Đã thêm {n} từ – vào Ôn tập hoặc Học thông minh để bắt đầu!', { n: list.length }));
      header(); draw();
    };
  };

  // ================= TỪ ĐIỂN: trang #/dict ở js/dict-page.js (gói lười 'dictp', tách khỏi khung app 01/11) =================
  // Trang pháp lý đúng ngôn ngữ giao diện (web/<lang>/privacy.html sinh bởi scripts/build-legal.mjs); trong add-on/app trỏ về lexkite.com
  App.legalUrl = name => (/(^|\.)lexkite\.(com|pages\.dev)$/.test(location.hostname) ? '' : 'https://lexkite.com') + '/' + I18N.lang() + '/' + name;

  routes.contact = function () {
    const API = /(^|\.)lexkite\.(com|pages\.dev)$/.test(location.hostname) ? '/api/contact' : 'https://lexkite.com/api/contact';
    const t0 = Date.now(), u = state.user || {};
    let turnstileToken = '';
    view.innerHTML = `
      <div class="page-head"><div><h1>${t('Liên hệ')}</h1><p class="muted">${t('Góp ý, báo lỗi hay hợp tác – chúng tôi thường trả lời trong 1–2 ngày làm việc.')}</p></div></div>
      <form class="card contact-form" id="ctForm" style="max-width:640px" novalidate>
        <label>${t('Tên của bạn')}<input name="name" maxlength="100" autocomplete="name" value="${esc(u.displayName || '')}"></label>
        <label>${t('Email của bạn')} *<input name="email" type="email" required maxlength="200" autocomplete="email" value="${esc(u.email || '')}"></label>
        <label>${t('Nội dung')} *<textarea name="msg" required minlength="10" maxlength="5000" rows="6"></textarea></label>
        <input name="hp" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px">
        <div id="cfTurnstile" style="margin:.6rem 0"></div>
        <div class="row" style="gap:.8rem;align-items:center"><button class="btn primary" type="submit">${t('Gửi tin nhắn')}</button><span class="small muted" id="ctMsg" role="status"></span></div>
      </form>
      <p class="small muted" style="margin-top:1rem">${t('Hoặc email trực tiếp')}: <a href="mailto:support@lexkite.com">support@lexkite.com</a></p>`;
    // Cloudflare Turnstile: tải ngầm khi mở form liên hệ (bảo vệ chống bot)
    const siteKey = window.TURNSTILE_SITE_KEY || '0x4AAAAAAAMmZ7O1jJgQv8iY';
    const noTs = !!(window.VBNative && VBNative.is); // app gốc (capacitor://localhost): Turnstile báo lỗi 400020 & hiện khung lỗi → bỏ; máy chủ chỉ xác minh khi có token, vẫn chặn spam bằng ô bẫy/thời gian/hạn mức
    if (!noTs && !window.turnstile && !document.getElementById('cf-turnstile-script')) {
      const s = document.createElement('script'); s.id = 'cf-turnstile-script';
      s.src = '';
      s.async = true; s.defer = true; document.head.appendChild(s);
    }
    const renderTurnstile = () => {
      if (window.turnstile && $('#cfTurnstile') && !$('#cfTurnstile').hasChildNodes()) {
        try {
          window.turnstile.render('#cfTurnstile', {
            sitekey: siteKey,
            callback: tok => { turnstileToken = tok; },
            'error-callback': () => { turnstileToken = ''; },
            'expired-callback': () => { turnstileToken = ''; },
            theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'auto',
          });
        } catch (e) { /* bỏ qua nếu không render được */ }
      }
    };
    if (noTs) { /* không dùng Turnstile */ } else if (window.turnstile) renderTurnstile();
    else { let c = 0; const iv = setInterval(() => { c++; if (window.turnstile) { clearInterval(iv); renderTurnstile(); } else if (c > 15) clearInterval(iv); }, 300); }

    const f = $('#ctForm'), out = $('#ctMsg');
    f.onsubmit = async e => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(f));
      if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(d.email)) { out.textContent = t('Vui lòng nhập email hợp lệ.'); f.email.focus(); return; }
      if (d.msg.trim().length < 10) { out.textContent = t('Nội dung quá ngắn (tối thiểu 10 ký tự).'); f.msg.focus(); return; }
      const btn = f.querySelector('button'); btn.disabled = true; out.textContent = t('Đang gửi…');
      try {
        const r = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...d, token: turnstileToken, lang: I18N.lang(), ms: Date.now() - t0 }) });
        if (r.status === 429) throw new Error('rate');
        if (!r.ok) throw new Error('fail');
        f.innerHTML = `<div class="center" style="padding:1.5rem"><div style="font-size:2.5rem">✉️</div><h3>${t('Đã gửi!')}</h3><p class="muted">${t('Cảm ơn bạn. Chúng tôi sẽ trả lời qua email {email}.', { email: esc(d.email) })}</p></div>`;
      } catch (err) {
        btn.disabled = false;
        out.textContent = err.message === 'rate' ? t('Bạn đã gửi nhiều tin, vui lòng thử lại sau 1 giờ.') : t('Chưa gửi được, vui lòng thử lại hoặc email support@lexkite.com.');
      }
    };
  };

  // Lời mời cài add-on (chỉ Chromium máy tính, chưa cài – web/js/ext-cta.js quyết định), nạp lười; URL cửa hàng: js/ext-config.js
  let extP = null;
  const extCta = () => Store.isExtension ? Promise.resolve(null) : (extP || (extP = loadScript('js/ext-config.js').then(() => loadScript('js/ext-cta.js')).catch(() => {}))).then(() => { if (window.LKExt) LKExt.scan(view); return window.LKExt || null; });
  App.extCta = extCta; // trang Từ điển (dict-page.js, tải lười) gọi lời mời cài add-on
  // Nút "Tải app" (menu bên + trang Tôi + nút cài trên Android): js/get-app.js chọn CWS / Google Play / hướng dẫn cài theo nền tảng, nạp lười sau add-on
  let gaP = null;
  window.LK_GETAPP_T = () => ({ iph: [t('Cài Lexkite lên iPhone'), t('Bấm nút <b>Chia sẻ</b> <span style="font-size:1.2rem">⎋</span> ở thanh dưới của Safari'), t('Chọn <b>“Thêm vào MH chính”</b> (Add to Home Screen)'), t('Bấm <b>Thêm</b> – biểu tượng Lexkite sẽ xuất hiện như một app')],
    crios: [t('Bấm nút <b>Chia sẻ</b> <span style="font-size:1.2rem">⎋</span> ở thanh địa chỉ của Chrome')],
    ipad: [t('Cài Lexkite lên iPad'), t('Bấm nút <b>Chia sẻ</b> <span style="font-size:1.2rem">⎋</span> trên thanh trên cùng của Safari')],
    mac: [t('Cài Lexkite lên Mac'), t('Trong Safari, chọn <b>Tệp › Thêm vào Dock</b>'), t('Bấm <b>Thêm</b> – Lexkite sẽ mở như một app')], ok: t('Đã hiểu') });
  App.getApp = root => Store.isExtension ? Promise.resolve(null) : (gaP || (gaP = extCta().then(() => loadScript('js/get-app.js')).catch(() => {}))).then(() => { if (window.LKGetApp) LKGetApp.scan(root || document); return window.LKGetApp || null; });

  // ================= SỔ TỪ =================
  // 🔗 Chia sẻ bộ thẻ: nén danh sách từ vào chính đường link (không máy chủ, không giới hạn). Chỉ gồm nội dung từ – không có ngữ cảnh cá nhân/tiến độ.
  const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64u = s2 => Uint8Array.from(atob(s2.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  async function packDeck(name, cards) {
    const data = JSON.stringify({ v: 1, n: String(name).slice(0, 80), w: cards.slice(0, 300).map(c => [c.word, c.ipa || '', c.pos || '', c.vi || '', c.def || '', (c.ex || '').slice(0, 160)]) });
    const buf = await new Response(new Blob([data]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer();
    return 'https://lexkite.com/app/#/deck?share=' + b64u(buf);
  }
  async function unpackDeck(code) {
    const txt = await new Response(new Blob([unb64u(code)]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
    const d = JSON.parse(txt); if (!d || !Array.isArray(d.w)) throw new Error('bad');
    return { name: String(d.n || 'Lexkite'), words: d.w.filter(r => Array.isArray(r) && r[0]).map(r => ({ word: String(r[0]).slice(0, 60), ipa: r[1] || '', pos: r[2] || '', vi: r[3] || '', def: r[4] || '', ex: r[5] || '' })) };
  }
  async function shareDeck(name, cards) {
    if (!cards.length) return toast(t('Chưa có từ nào để chia sẻ'));
    if (typeof CompressionStream === 'undefined') return toast(t('Trình duyệt chưa hỗ trợ – hãy cập nhật trình duyệt'));
    const url = await packDeck(name, cards);
    if (navigator.share) { try { await navigator.share({ title: name, text: t('Bộ thẻ từ vựng trên Lexkite: {n}', { n: name }), url }); return; } catch (e) { /* người dùng hủy → hiện link */ } }
    const box = modal(`<h2>🔗 ${t('Chia sẻ bộ thẻ')}</h2><p class="muted small">${t('{n} từ · người nhận mở link là xem trước và thêm vào lịch ôn của họ.', { n: Math.min(300, cards.length) })}</p><input class="input" id="shUrl" readonly value="${esc(url)}"><div class="row" style="margin-top:.8rem"><button class="btn primary" id="shCopy">📋 ${t('Sao chép link')}</button><button class="btn ghost" data-close>${t('Đóng')}</button></div>`);
    $('#shCopy', box).onclick = async () => { try { await navigator.clipboard.writeText(url); toast('✓ ' + t('Đã sao chép link')); } catch (e) { $('#shUrl', box).select(); } };
  }
  async function sharedPreview(code) {
    view.innerHTML = `<p class="muted">${t('Đang mở bộ thẻ…')}</p>`;
    let d; try { d = await unpackDeck(code); } catch (e) { view.innerHTML = `<div class="card center"><h2>${t('Link bộ thẻ không hợp lệ')}</h2><a class="btn" href="#/deck">${t('Về Sổ từ')}</a></div>`; return; }
    const fresh = d.words.filter(w => !inDeck(w.word));
    view.innerHTML = `<div class="page-head"><div><div class="muted small">🔗 ${t('Bộ thẻ được chia sẻ')}</div><h1>${esc(d.name)}</h1><p class="muted">${t('{n} từ · {k} từ mới với bạn', { n: d.words.length, k: fresh.length })}</p></div></div>
      <button class="btn primary lg block" id="shAdd" ${fresh.length ? '' : 'disabled'}>＋ ${t('Thêm vào lộ trình ôn FSRS của tôi')}</button>
      <div class="card" style="margin-top:1rem">${d.words.map(w => `<div class="word-row"><div style="min-width:0"><b>${esc(w.word)}</b> <span class="ipa small">${esc(w.ipa)}</span>${inDeck(w.word) ? ' <span class="chip">✓</span>' : ''}<div class="small vi">${esc(App.meanOf(w))}</div></div></div>`).join('')}</div>`;
    $('#shAdd').onclick = async () => {
      const b = $('#shAdd'); b.disabled = true; b.textContent = t('Đang thêm…');
      for (const w of fresh) await addWord({ ...w, topic: 'shared' }, null, { silent: true });
      Sfx.win(); confetti(100); toast(t('Đã thêm {n} từ vào lịch ôn', { n: fresh.length }));
      location.hash = '#/deck';
    };
  }
  routes.deck = function (arg, query) {
    if (query && query.get('share')) return sharedPreview(query.get('share'));
    const from = query && query.get('from') || '';
    const list = Object.values(state.cards);
    view.innerHTML = `
      <div class="page-head"><div><h1>${t('Sổ từ của bạn')}</h1><p class="muted">${t('{n} từ · {k} đã thuộc', { n: list.length, k: masteredCount() })}</p></div>
        <div class="row"><a class="btn sm" href="#/practice/learn?src=deck">🧠 ${t('Học')}</a><a class="btn sm" href="#/practice/test?src=deck">📝 ${t('Kiểm tra')}</a><button class="btn sm" id="shareBtn">🔗 ${t('Chia sẻ bộ thẻ')}</button><button class="btn sm" id="exportBtn">⬇️ ${t('Xuất')}</button><label class="btn sm">⬆️ ${t('Nhập')}<input type="file" id="importFile" accept="application/json" hidden></label><button class="btn sm" id="ankiOut">🃏 ${t('Xuất sang Anki')}</button><button class="btn sm" id="ankiIn">🃏 ${t('Nhập từ Anki')}</button></div></div>
      <div class="grid g4" style="margin-bottom:1rem">
        <input class="input" id="filterQ" placeholder="${t('Tìm từ hoặc nghĩa…')}" aria-label="${t('Tìm từ hoặc nghĩa…')}">
        <select class="input" id="filterTopic" aria-label="${t('Chọn bộ từ')}"><option value="">${t('Tất cả bộ từ')}</option>${TOPICS.map(t => `<option value="${t.id}">${t.emoji} ${esc(t.name)}</option>`).join('')}<option value="mine">📌 ${t('Từ tự thêm')}</option>${[...new Set(list.map(c => c.deck).filter(Boolean))].sort().map(d => `<option value="deck:${esc(d)}">🃏 ${esc(d)}</option>`).join('')}</select>
        <select class="input" id="filterFrom" aria-label="${t('Mọi nguồn')}"><option value="">${t('Mọi nguồn')}</option>${Object.entries(ORIGINS).map(([k, o]) => `<option value="${k}" ${from === k ? 'selected' : ''}>${o.emoji} ${o.name}</option>`).join('')}<option value="forget" ${from === 'forget' ? 'selected' : ''}>⚠️ ${t('Sắp quên')}</option></select>
        <select class="input" id="filterM" aria-label="${t('Mọi mức độ')}"><option value="">${t('Mọi mức độ')}</option><option value="0">${t('Chưa học')}</option><option value="12">${t('Đang luyện')}</option><option value="1">${t('Đang học')}</option><option value="2">${t('Quen')}</option><option value="3">${t('Đã thuộc')}</option></select>
      </div>
      <div class="card" id="deckList"></div>`;
    let shownRows = list;
    const draw = () => {
      const q = $('#filterQ').value.trim().toLowerCase(), tp = $('#filterTopic').value, m = $('#filterM').value, fr = $('#filterFrom').value;
      const forgetSet = new Set(forgetting().map(c => c.word));
      const rows = list.filter(c => (!q || c.word.includes(q) || (c.vi || '').toLowerCase().includes(q)) && (!tp || (tp.startsWith('deck:') ? c.deck === tp.slice(5) : c.topic === tp)) && (m === '' || (m === '12' ? c.srs && (c.srs.reps > 0 || c.srs.last) && SRS.mastery(c.srs) < 3 : SRS.mastery(c.srs) === +m))
        && (!fr || (fr === 'forget' ? forgetSet.has(c.word) : origin(c) === fr))).sort((a, b) => fr === 'forget' ? SRS.retention(a.srs) - SRS.retention(b.srs) : b.added - a.added);
      shownRows = rows;
      $('#deckList').innerHTML = rows.length ? rows.slice(0, 400).map(c => `
        <div class="deck-row">
          <div class="em">${c.image ? `<img src="${esc(c.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : esc(c.emoji)}</div>
          <div style="min-width:0"><a href="#/dict/${encodeURIComponent(c.word)}"><b>${esc(c.word)}</b></a> <span class="ipa small">${esc(c.ipa)}</span><div class="small">${esc(App.meanOf(c))}</div></div>
          <div class="small muted hide-sm">${c.contexts[0] ? `📌 “${highlight(c.contexts[0].text.slice(0, 110), c.word)}${c.contexts[0].text.length > 110 ? '…' : ''}”` : esc((c.def || '').slice(0, 110))}</div>
          <div class="hide-sm small muted" style="text-align:right" title="${t('Đến hạn {date}', { date: new Date(c.srs.due).toLocaleDateString(I18N.lang()) })}">${masteryDots(c.srs)}${SRS.retention(c.srs) != null ? `<div class="tiny">🧠 ${Math.round(SRS.retention(c.srs) * 100)}%</div>` : ''}</div>
          <div class="row nowrap" style="gap:.3rem"><button class="icon-btn sm" data-speak="${esc(c.word)}" data-url="${esc(UI.audioFor(c))}">🔊</button><button class="icon-btn sm" data-edit="${esc(c.word)}" title="${t('Sửa')}">✏️</button></div>
        </div>`).join('') + (rows.length > 400 ? `<p class="muted small center">${t('Hiển thị 400/{n} từ – dùng bộ lọc để thu hẹp.', { n: rows.length })}</p>` : '')
        : `<div class="empty"><div class="em">📒</div>${list.length ? t('Không có từ phù hợp bộ lọc.') : t('Sổ từ đang trống. Hãy thêm từ từ <a href="#/library">thư viện</a> hoặc <a href="#/dict">tra từ</a>.')}</div>`;
      bindCommon();
      $$('[data-edit]').forEach(b => b.onclick = () => editCard(b.dataset.edit, draw));
    };
    ['filterQ', 'filterTopic', 'filterM', 'filterFrom'].forEach(id => $('#' + id).addEventListener('input', draw));
    const qm = query && query.get('m'); if (qm && [...$('#filterM').options].some(o => o.value === qm)) $('#filterM').value = qm; // #/deck?m=12|3 từ ô số liệu màn Ôn
    draw();
    const dn = () => { const tp = $('#filterTopic').value, T = TOPICS.find(x => x.id === tp); return T ? T.name : tp.startsWith('deck:') ? tp.slice(5) : t('Sổ từ'); };
    $('#exportBtn').onclick = () => App.xport({ shown: shownRows, name: dn() });
    $('#shareBtn').onclick = () => { const tp = $('#filterTopic').value, T = TOPICS.find(x => x.id === tp); shareDeck(T ? T.name : t('Bộ từ của {n}', { n: (state.user && state.user.displayName) || 'Lexkite' }), shownRows); };
    $('#importFile').onchange = importData;
    $('#ankiOut').onclick = () => App.anki('export', { ...ankiAll(), shown: shownRows, name: dn() });
    $('#ankiIn').onclick = () => App.anki('import');
  };

  async function importData(e) {
    const f = e.target.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!data.cards) throw new Error();
      await Cards.save({ ...(await Cards.all()), ...data.cards }); // kho đầy đủ: state.cards chỉ là thẻ của ngôn ngữ đích đang học
      if (data.stats) { const s = state.stats; for (const [k, v] of Object.entries(data.stats.days || {})) s.days[k] = Math.max(s.days[k] || 0, v); await Store.set('stats', s); }
      if (data.game && data.game.xp > state.game.xp) await Store.set('game', data.game);
      await load(); toast(t('Đã nhập {n} thẻ', { n: Object.keys(data.cards).length })); route();
    } catch (err) { toast(t('File không hợp lệ')); }
  }

  function editCard(word, after) {
    const c = state.cards[word.toLowerCase()];
    if (!c) return;
    modal(`<h2>${t('Sửa “{w}”', { w: esc(c.word) })}</h2>
      <div class="stack">
        <label class="field"><span>${t('Nghĩa tiếng Việt')}</span><input class="input" id="eVi" value="${esc(c.vi)}"></label>
        <label class="field"><span>${t('Phiên âm')}</span><input class="input" id="eIpa" value="${esc(c.ipa)}"></label>
        <label class="field"><span>${t('Câu ví dụ')}</span><textarea class="input" id="eEx">${esc(c.ex)}</textarea></label>
        <label class="field"><span>${t('Ghi chú / mẹo nhớ')}</span><textarea class="input" id="eNote" placeholder="${t('VD: liên tưởng, từ gốc, cách dùng trong Writing…')}">${esc(c.note)}</textarea></label>
        <label class="field"><span>${t('URL hình minh họa (để trống để dùng emoji {e})', { e: esc(c.emoji) })}</span><input class="input" id="eImg" value="${esc(c.image)}"></label>
      </div>
      <div class="row between" style="margin-top:1.2rem">
        <button class="btn danger" id="eDel">🗑 ${t('Xóa')}</button>
        <div class="row"><button class="btn" id="eReset" title="${t('Học lại từ đầu')}">↺ ${t('Học lại')}</button><button class="btn" data-close>${t('Hủy')}</button><button class="btn primary" id="eSave">${t('Lưu')}</button></div>
      </div>`);
    $('#eSave').onclick = async () => {
      Object.assign(c, { vi: $('#eVi').value.trim(), ipa: $('#eIpa').value.trim(), ex: $('#eEx').value.trim(), note: $('#eNote').value.trim(), image: $('#eImg').value.trim() });
      await Cards.update(c); closeModal(); toast(t('Đã lưu')); if (window.Sync) Sync.schedule(); after && after();
    };
    $('#eReset').onclick = async () => { c.srs = SRS.newState(); await Cards.update(c); closeModal(); updateChrome(); toast(t('Thẻ sẽ được học lại như từ mới')); after && after(); };
    $('#eDel').onclick = async () => {
      if (!confirm(t('Xóa “{w}” khỏi sổ từ?', { w: c.word }))) return;
      await Cards.remove(c.word); delete state.cards[c.word.toLowerCase()]; closeModal(); updateChrome(); if (window.Sync) Sync.schedule(); routes.deck(new URLSearchParams());
    };
  }

  // ================= TIẾN ĐỘ & HUY HIỆU =================
  // ================= TIẾN ĐỘ: trang #/stats ở js/stats-page.js (gói lười 'statsp', tách khỏi khung app 06/11) =================


  // ================= PHƯƠNG PHÁP HỌC =================
  // Trang Phương pháp: js/method.js

  // ================= CÀI ĐẶT =================

  // Quyền quản trị: máy chủ xác nhận email nằm trong ADMIN_EMAILS (/api/admin ping) – đệm theo phiên, người khác không bao giờ thấy mục quản trị
  App.adminUrl = (tab = '') => (/^https?:/.test(location.protocol) ? '/admin' : 'https://lexkite.com/admin') + (tab ? '#' + tab : '');
  App.isAdmin = async () => {
    const u = window.Sync && Sync.user; if (!u) return false;
    let ok = null; try { ok = sessionStorage.getItem('lk.adm.' + u.uid); } catch (e) { /* bỏ qua */ }
    if (ok == null) { try { const r = await fetch((/^https?:/.test(location.protocol) ? '' : 'https://lexkite.com') + '/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await u.getIdToken() }, body: '{"op":"ping"}' }); ok = r.ok ? '1' : '0'; try { sessionStorage.setItem('lk.adm.' + u.uid, ok); } catch (e) { /* bỏ qua */ } } catch (e) { return false; } }
    try { if (ok === '1') localStorage.setItem('lk.vimg.adm', '1'); else localStorage.removeItem('lk.vimg.adm'); } catch (e) { /* bỏ qua */ }   // quản trị luôn thấy ảnh (bật dần vocab_img_pct)
    return ok === '1';
  };
  // ================= CHÀO MỪNG & THIẾT LẬP BAN ĐẦU =================
  // Bộ chọn ngôn ngữ giao diện: chỉ liệt kê ngôn ngữ đã dịch đầy đủ (tránh giao diện nửa nọ nửa kia)
  // ≤ 3 ngôn ngữ: nút bấm; nhiều hơn: danh sách thả xuống, tên ngôn ngữ viết bằng chính tiếng đó (Español, 日本語…)
  App.langPicker = () => I18N.SUPPORTED.length <= 3
    ? `<div class="tabs" data-lang-pick style="display:inline-flex" translate="no">${I18N.SUPPORTED.map(l => `<button data-v="${l}" lang="${l}" class="${I18N.lang() === l ? 'on' : ''}">${I18N.LANGS[l][1]}</button>`).join('')}</div>`
    : `<select class="input lang-select" data-lang-select aria-label="Language" translate="no">${I18N.SUPPORTED.map(l => `<option value="${l}" lang="${l}" ${I18N.lang() === l ? 'selected' : ''}>${I18N.LANGS[l][1]}</option>`).join('')}</select>`;
  document.addEventListener('change', e => { if (e.target.matches && e.target.matches('[data-lang-select]') && e.target.value !== I18N.lang()) I18N.set(e.target.value); });
  document.addEventListener('click', e => { const b = e.target.closest('[data-lang-pick] [data-v]'); if (b && b.dataset.v !== I18N.lang()) I18N.set(b.dataset.v); });
  // Trang giới thiệu (js/welcome.js, tải lười) · thiết lập (js/onboard.js). Chuyển hướng người đã có dữ liệu: welcomeGate trong route(), trước khi tải gói. Bảng trạng thái: docs/specs/welcome.md
  routes.welcome = function (step, query) {
    document.body.classList.add('bare');
    App.cleanup = () => document.body.classList.remove('bare');
    if (step === 'setup') return setup(query);
    if (!window.Welcome) return errState(true);
    return Welcome.draw(step === 'login'); // #/welcome/login: nút Đăng nhập nổi bật
  };

  // Thiết lập lần đầu TỪNG BƯỚC (1 câu hỏi/màn – js/onboard.js, tải lười): mục tiêu → trình độ / kiểm tra đầu vào → điểm mục tiêu → cường độ → vào thẳng Ngày 1 (chưa cần tài khoản)
  async function setup(query) {
    const s = query && query.get('s');
    if (window.Onboard && Onboard.go(s)) return; // đang trong thiết lập (Back/vuốt/Esc): chỉ vẽ lại đúng bước, không khung chờ, không tải lại
    view.innerHTML = `<div class="onb" style="max-width:600px;margin:0 auto" aria-busy="true"><div class="skel skel-l"></div><div class="skel skel-l"></div><div class="skel skel-l"></div></div>`;
    await App.need('pathx', 'onb').catch(() => {});
    if (!window.Onboard) return errState(true);
    Onboard.run(s, { view, TOPICS, topicOf, inDeck, addWord, saveSettings, finish: finishOnboarding, login: loginOnboard });
  }

  // Có dữ liệu = đã thiết lập, có thẻ hoặc có XP (cùng phép với khởi động). Bảng ai thấy gì: docs/specs/welcome.md
  const hasData = () => !!(state.settings.onboarded || Object.keys(state.cards).length || (state.game && state.game.xp));
  App.hasData = hasData;
  App.homeHref = () => (hasData() ? '#/home' : '#/welcome'); // nút thoát của trang mở từ màn chào: người mới về lại màn chào
  // location.pathname + search: app có <base href="/">, đường dẫn tương đối "#/x" sẽ ra khỏi /app/
  App.replaceHash = h => location.replace(location.pathname + location.search + h);
  // Người có dữ liệu không thấy lại màn chào; replace để Back không kẹt vòng lặp. #/welcome/login: đã đăng nhập → #/me (lk.acct = gợi ý lúc Firebase chưa trả lời), chưa thì ở lại trang giới thiệu để đăng nhập gộp dữ liệu
  let setupTo = ''; // finishOnboarding đang lùi về đầu thiết lập → trang đích
  function welcomeGate(step) {
    if (!hasData()) return false;
    if (setupTo) { const x = setupTo; setupTo = ''; App.replaceHash(x); return true; }
    let acct = state.user; if (!acct) try { acct = !Store.sandbox && localStorage.getItem('lk.acct'); } catch (e) { /* bỏ qua */ }
    if (step === 'login' && !acct) return false;
    App.replaceHash(step === 'login' ? '#/me' : '#/home');
    return true;
  }

  // Đăng nhập ở màn chào/thiết lập: chờ tài khoản (≤ 6 s, hủy = không đổi gì) rồi chờ gộp xong (≤ 15 s). Tài khoản có dữ liệu → vào app; trống → empty() (ở lại đúng bước / sang thiết lập), KHÔNG đánh dấu đã thiết lập.
  let loginP = null;
  function loginOnboard(empty) {
    return loginP || (loginP = (async () => {
      if (!window.Sync) return empty && empty();
      await Sync.signIn();
      for (let i = 0; i < 30 && !state.user; i++) await new Promise(r => setTimeout(r, 200));
      if (!state.user) return;
      const merged = Promise.resolve(Sync.merged && Sync.merged()).then(() => 1, () => 1), done = await Promise.race([merged, new Promise(r => setTimeout(r, 15000))]);
      if (hasData()) return finishOnboarding();
      if (empty) empty();
      if (!done) merged.then(() => { if (hasData() && /^#\/welcome/.test(location.hash)) finishOnboarding(); }); // mạng chậm: dữ liệu về sau → vẫn vào app
    })().finally(() => { loginP = null; }));
  }
  App.loginOnboard = loginOnboard;
  async function finishOnboarding(celebrate, to = '#/home') {
    state.settings.onboarded = true;
    let back = 0;
    try { if (/^#\/welcome\/setup/.test(location.hash)) back = ((history.state && history.state.n) || 0) + ((JSON.parse(sessionStorage.getItem('lk.onbPick')) || {}).w ? 1 : 0); sessionStorage.removeItem('lk.onbPick'); } catch (e) { /* bỏ qua */ }
    if (state.settings.plXpDue) { delete state.settings.plXpDue; App.reward({ quizzes: 1, xp: 20 }); } // XP bài đầu vào làm trước khi thiết lập (placement.js)
    await saveSettings();
    if (!Store.sandbox) try { localStorage.setItem('lk.onb', '1'); } catch (e) { /* bỏ qua */ } // lk.onb = gợi ý về dữ liệu THẬT (khung chào, trang giới thiệu tự vào app) – phiên ?sandbox=1 không được ghi
    document.body.classList.remove('bare');
    // Bỏ các mục lịch sử của từng bước (+ Welcome ngay trước đó): lùi tới mục đầu rồi THAY bằng trang đích, Back từ Hôm nay không đi qua thiết lập. welcomeGate thay; quá 500 ms mà không tới (đếm lệch, trình duyệt chặn) thì thay tại chỗ
    if (back) { setupTo = to; history.go(-back); setTimeout(() => { if (setupTo) { const x = setupTo; setupTo = ''; App.replaceHash(x); } }, 500); }
    else if (/^#\/welcome/.test(location.hash)) App.replaceHash(to); else location.hash = to;
    if (celebrate === true) { Sfx.win(); confetti(140); toast('🎉 ' + t('Bộ thẻ đã sẵn sàng – bắt đầu bài ôn đầu tiên nhé!'), 3500); }
  }

  // Dữ liệu mẫu cho ảnh giới thiệu (?demo=1, chỉ áp dụng khi máy chưa có dữ liệu)

  // ---------- Sự kiện dùng chung ----------
  function bindCommon(after) {
    $$('[data-speak]').forEach(b => b.onclick = e => { e.preventDefault(); e.stopPropagation(); speak(b.dataset.speak, b.dataset.accent || state.settings.accent, b.dataset.url || ''); });
    $$('[data-speak-text]').forEach(b => b.onclick = e => { e.stopPropagation(); speak(b.dataset.speakText, state.settings.accent); });
    $$('[data-slow]').forEach(b => b.onclick = e => { e.stopPropagation(); const w = INDEX[String(b.dataset.slow).toLowerCase()] || state.cards[String(b.dataset.slow).toLowerCase()]; speak(b.dataset.slow, state.settings.accent, w && UI.audioFor(w, state.settings.accent), true); });
    $$('[data-add-seed]').forEach(b => b.onclick = async e => {
      e.preventDefault();
      const k = b.dataset.addSeed.toLowerCase(), lr = !INDEX[k] && window.Lex ? await Lex.get(k).catch(() => null) : null;
      const w = INDEX[k] || (lr && lr.via === 'exact' ? lr.entry : null);
      if (!w) return;
      await addWord(b.dataset.topic ? { ...w, topic: b.dataset.topic } : w);
      b.outerHTML = `<span class="chip ok">✓ ${t('Đã thêm')}</span>`;
      toast(t('Đã thêm “{w}” vào flashcard', { w: w.word }));
      after && after();
    });
  }
  App.bindCommon = bindCommon;

  // ---------- Cài app (PWA) & trạng thái mạng ----------
  let installEvt = null;
  const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true || !!(window.VBNative && VBNative.is); // app gốc iOS/Android = đã cài → không mời "Cài app"/"Thêm vào MH chính"
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
  const playKind = () => !!(window.LKGetApp && LKGetApp.kind() === 'play'); // Android có bản Google Play → nút cài mở Play thay vì PWA
  function showInstallBtn() {
    if (Store.isExtension || isStandalone() || $('#installBtn')) return;
    if (!installEvt && !isIOS() && !playKind()) return;
    const b = document.createElement('button');
    b.id = 'installBtn'; b.className = 'pill'; b.style.cursor = 'pointer'; b.style.color = 'var(--primary)';
    b.innerHTML = `📲 <span class="hide-sm">${playKind() ? t('Tải app') : t('Cài app')}</span>`;
    b.title = playKind() ? t('Tải app') : t('Cài Lexkite lên màn hình chính');
    b.onclick = async () => {
      if (playKind()) { LKGetApp.open('top'); return; }
      if (installEvt) { installEvt.prompt(); const r = await installEvt.userChoice; if (r.outcome === 'accepted') { b.remove(); toast('🎉 ' + t('Đã cài Lexkite!')); } installEvt = null; return; }
      modal(`<h2>📲 ${t('Cài Lexkite lên iPhone')}</h2><ol style="line-height:2;padding-left:1.2rem"><li>${t('Bấm nút <b>Chia sẻ</b> <span style="font-size:1.2rem">⎋</span> ở thanh dưới của Safari')}</li><li>${t('Chọn <b>“Thêm vào MH chính”</b> (Add to Home Screen)')}</li><li>${t('Bấm <b>Thêm</b> – biểu tượng Lexkite sẽ xuất hiện như một app')}</li></ol><button class="btn primary block" data-close>${t('Đã hiểu')}</button>`);
    };
    $('.top-stats').prepend(b);
  }
  // Chrome bắn sự kiện này bất kỳ lúc nào: chèn nút ngay sẽ đẩy cả cụm thanh trên sang trái 50 px khi đang đọc (CLS, J8 đỏ ngẫu nhiên) → chèn ở lần chuyển trang kế tiếp
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; window.addEventListener('hashchange', showInstallBtn, { once: true }); setTimeout(() => App.installNudge && App.installNudge(), 25000); });
  window.addEventListener('appinstalled', () => { const b = $('#installBtn'); if (b) b.remove(); });
  // Gợi ý cài app đúng lúc (như các app lớn): trên điện thoại, sau khi đã học ≥ 3 ngày, tối đa 1 lần/14 ngày – không làm phiền người mới
  App.installNudge = () => {
    try {
      if (Store.isExtension || isStandalone() || !matchMedia('(max-width: 900px)').matches || (!installEvt && !isIOS())) return;
      const active = Object.values(state.game.days || {}).filter(d => d.xp || d.reviews).length, last = +localStorage.getItem('vb.nudgeAt') || 0;
      if (active < 3 || Date.now() - last < 14 * 864e5 || document.querySelector('.install-nudge')) return;
      localStorage.setItem('vb.nudgeAt', Date.now());
      const n = document.createElement('div'); n.className = 'install-nudge card';
      n.innerHTML = `<div class="row nowrap" style="gap:.7rem"><img src="icons/icon-192.png" alt="" width="44" height="44" style="border-radius:12px"><div style="flex:1;min-width:0"><b>${t('Cài Lexkite như một app')}</b><div class="tiny muted">${t('Mở nhanh từ màn hình chính, toàn màn hình, học được cả khi offline')}</div></div><button class="icon-btn sm" data-x aria-label="${t('Đóng')}">✕</button></div><button class="btn primary block" data-go style="margin-top:.6rem">📲 ${t('Cài ngay – miễn phí')}</button>`;
      document.body.appendChild(n);
      n.querySelector('[data-x]').onclick = () => n.remove();
      n.querySelector('[data-go]').onclick = () => { n.remove(); showInstallBtn(); const b = $('#installBtn'); if (b) b.click(); };
    } catch (e) { /* bỏ qua */ }
  };
  const netState = () => { document.body.classList.toggle('offline', !navigator.onLine); };
  window.addEventListener('offline', () => { netState(); toast('📴 ' + t('Mất kết nối – vẫn ôn tập được, tra từ mới cần mạng')); });
  window.addEventListener('online', () => { netState(); toast('✅ ' + t('Đã có mạng trở lại')); });

  // ---------- Khởi động ----------
  // Thanh cuộn ngang còn mục bị khuất → mờ mép tương ứng (.fade-start/.fade-end); theo dõi #view vì nội dung vẽ lười/đổi theo bước
  const edgeFade = () => $$('#view .tabs, #view .steps, #view .set-nav').forEach(s => {
    const f = () => { const o = s.scrollWidth - s.clientWidth, x = Math.abs(s.scrollLeft); s.classList.toggle('fade-end', o > 2 && x < o - 2); s.classList.toggle('fade-start', o > 2 && x > 2); };
    f(); if (!s.efOn) { s.efOn = 1; s.addEventListener('scroll', f, { passive: true }); }
  });
  { let q = 0; const kick = () => { if (q) return; q = 1; requestAnimationFrame(() => { q = 0; edgeFade(); }); }; const v = document.getElementById('view'); if (v && window.MutationObserver) new MutationObserver(kick).observe(v, { childList: true, subtree: true }); addEventListener('resize', kick, { passive: true }); }
  // 🐕 Canh khởi động (thấy trên live 4/11: indexedDB.open treo → App.ready không xong, #view trắng vĩnh viễn): 8 s chưa vẽ → thẻ lỗi, Thử lại = tải lại trang. KHÔNG đọc dữ liệu giả (sẽ ghi đè dữ liệu thật).
  // Dữ liệu treo thì khung chào #lkHero cũng là trang chết (bấm không đi đâu) → thay luôn; dữ liệu đã về mà còn chờ bản dịch thì giữ khung chào.
  const bootDog = setTimeout(() => { if (state.game && routeSeq) return; if (!view.children.length || (!state.game && view.querySelector('#lkHero'))) errState(true, true); }, 8000);
  App.ready = (async function init() {
    if (/[?&]demo=1/.test(location.search)) { await App.need('demo'); await App.seedDemo(); }
    if (Store.sandbox) setTimeout(() => toast('🧪 ' + t('Chế độ thử nghiệm – dữ liệu tách riêng, không đồng bộ')), 800);
    try { await load(); } finally { if (!state.game) state.game = await Game.get().catch(() => null); dataReady(); }
    document.addEventListener('error', e => {
      const img = e.target;
      if (img.tagName === 'IMG' && img.parentElement && (img.parentElement.classList.contains('pic') || img.parentElement.classList.contains('em'))) img.parentElement.textContent = '📘';
    }, true);
    if (Store.isExtension && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(ch => { if (ch.cards) { state.cards = Cards.view(Object.assign(Object.create(null), ch.cards.newValue || {})); updateChrome(); } });
    }
    if (!Store.isExtension && !(window.VBNative && VBNative.is) && 'serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('/sw.js', { scope: '/app/' }).catch(() => {}); // app ở /app/ (trang / là trang giới thiệu tĩnh) – sw.js gốc tự chuyển bản cài cũ (phạm vi /) sang chế độ chuyển tiếp, xem web/sw.js. Đăng ký lúc này = sau lần vẽ đầu (JS khung nạp sau khung hình đầu – scripts/app-loader.mjs) nên không làm chậm màn đầu
    setTimeout(() => Promise.all(BUNDLES.voice.map(f => fetch(f).catch(() => {}))).then(() => App.calm(() => { App.need('voice').catch(() => {}); App.need('klocal').catch(() => {}); })), 4000); /* giọng Kokoro cho phát âm từ ở mọi trang */
    App.offerRescue = offerRescue; applyFreeze().then(() => setTimeout(() => offerRescue().catch(() => {}), 1500)).catch(() => {});
    App.painted.then(() => idle(() => App.need('remind').then(() => Remind.start()).catch(() => {}))); // ⏰ nhắc học (js/remind.js, docs/REMINDERS.md)
    netState(); setTimeout(showInstallBtn, 1500);
    document.addEventListener('visibilitychange', async () => { if (!document.hidden) { state.cards = await Cards.mine(); state.stats = await Stats.get(); state.game = await Game.get(); updateChrome(); } });
    window.addEventListener('lk:tl', async () => { state.cards = await Cards.mine(); updateChrome(); }); // đổi ngôn ngữ đích (Cài đặt) → Sổ từ/Ôn theo ngôn ngữ mới
  })();
  // Các module khác (study.js, reading.js) đăng ký route rồi mới vẽ trang đầu tiên
  // Chỉ vẽ trang khi mọi module (study, grammar, pron, plan…) đã tải xong
  const boot = async () => {
    await Promise.all([App.ready, I18N.whenReady && I18N.whenReady()]); // từ điển ngôn ngữ nạp xong rồi mới vẽ (không lẫn tiếng Việt)
    clearTimeout(bootDog);
    updateChrome(); // vẽ lại thanh bên/đầu trang: lần vẽ trong load() có thể diễn ra trước khi từ điển nạp xong
    const fresh = !hasData();
    if (!Store.sandbox) try { fresh ? localStorage.removeItem('lk.onb') : localStorage.setItem('lk.onb', '1'); } catch (e) { /* bỏ qua */ } // sandbox: dữ liệu thử tách riêng → không ghi gợi ý (lk.onb sai làm trang giới thiệu chuyển vào app, bỏ khung chào → nhảy bố cục CLS 0,7 trên máy tính) // khung dựng sẵn trong index.html chỉ hiện cho người mới
    if (!fresh) document.body.classList.remove('bare');
    if (fresh && /^(#\/?(home)?)?$/.test(location.hash)) { App.replaceHash('#/welcome'); addEventListener('pointerdown', App.prefetchAll, { once: true }); return; }
    // Đang trong phiên học → vẽ lại sẽ mất phiên (App.routeHeld)
    if (!routeSeq || !App.routeHeld()) route();
    App.prefetchAll();
    const nb = $('#notifBtn');
    if (nb) {
      nb.onclick = async () => {
        if (!window.NoticesUI) await App.need('notices');
        if (window.NoticesUI) NoticesUI.toggle();
      };
      setTimeout(async () => {
        if (!window.NoticesUI) await App.need('notices');
        if (window.NoticesUI) NoticesUI.init(state);
      }, 2500);
    }
    setTimeout(() => idle(refreshIPA), 15000);
    if (isIOS()) setTimeout(() => App.installNudge && App.installNudge(), 25000);
    if (!Store.isExtension && !isStandalone()) setTimeout(() => idle(() => App.getApp().then(() => showInstallBtn())), 3000); // menu "Tải app" + nút cài Android → Google Play
  };
  /* Thống kê ẩn danh + báo lỗi tự động (functions/api/hit.js) và thông báo đầu trang do quản trị đặt (functions/api/config.js).
   * Không cookie, không lưu IP: vid là mã ngẫu nhiên trên máy; 1 bản ghi mỗi phiên. Tắt khi ?sandbox / ?demo / trình duyệt tự động. */
  (() => {
    if (/[?&](sandbox|demo)=/.test(location.search) || navigator.webdriver) return;
    const BASE = /(^|\.)lexkite\.(com|pages\.dev)$/.test(location.hostname) ? '' : 'https://lexkite.com';
    const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    let vid, ret = 1;
    try { vid = localStorage.getItem('lk.vid'); if (!vid) { vid = rid(); ret = 0; localStorage.setItem('lk.vid', vid); } } catch (e) { vid = rid(); ret = 0; }
    const cur = () => (location.hash.match(/^#\/([a-z0-9-]+)/) || [, 'home'])[1], sid = rid(), path = cur(), t0 = Date.now();
    // Nền tảng: app Capacitor tách iOS / Android (dòng cũ 'app' vẫn đọc được trong Quản trị)
    const cap = window.Capacitor, capP = cap && cap.getPlatform ? cap.getPlatform() : '';
    const plat = /^chrome-extension:/.test(location.protocol) ? 'ext' : capP === 'ios' || capP === 'android' ? capP : /^capacitor:/.test(location.protocol) || cap ? 'app' : matchMedia('(display-mode: standalone)').matches ? 'pwa' : 'web';
    // Add-on: dùng chung mã khách với service worker (chrome.storage 'lk.vid') để thống kê add-on & phễu khớp nhau (áp dụng từ phiên sau)
    if (plat === 'ext' && window.chrome && chrome.storage) try { chrome.storage.local.get('lk.vid').then(o => { const x = o['lk.vid']; if (!x) chrome.storage.local.set({ 'lk.vid': vid }); else if (x !== vid) localStorage.setItem('lk.vid', x); }).catch(() => {}); } catch (e) { /* bỏ qua */ }
    const dev = innerWidth < 768 ? 'mobile' : innerWidth < 1100 ? 'tablet' : 'desktop';
    let pages = 1, dur = 0, since = document.visibilityState === 'visible' ? Date.now() : 0, errs = 0;
    // Chuẩn web-vitals: bỏ LCP nếu trang mở ở tab nền (ẩn trước khi vẽ xong) – tránh số ảo hàng chục giây
    let lcp = 0, hid = document.visibilityState === 'hidden' ? 0 : Infinity;
    addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') hid = Math.min(hid, performance.now()); }, true);
    try { new PerformanceObserver(l => { const e = l.getEntries().pop(); if (e && e.startTime < hid) lcp = Math.round(e.startTime); }).observe({ type: 'largest-contentful-paint', buffered: true }); } catch (e) { /* trình duyệt không hỗ trợ */ } // LCP thật của người dùng (Core Web Vitals)
    const send = d => { try { navigator.sendBeacon ? navigator.sendBeacon(BASE + '/api/hit', JSON.stringify(d)) : fetch(BASE + '/api/hit', { method: 'POST', body: JSON.stringify(d), keepalive: true, mode: 'no-cors' }); } catch (e) { /* bỏ qua */ } };
    // Quy mô lớn: chỉ một tỉ lệ người dùng gửi thống kê phiên (hit_rate do quản trị đặt, ổn định theo vid) – giữ D1/Functions trong gói miễn phí
    let rate = 1; try { rate = Math.min(1, Math.max(0.01, +localStorage.getItem('lk.hr') || 1)); } catch (e) { /* bỏ qua */ }
    // lk.noTrack = máy của quản trị (admin.js tự đặt khi mở trang Quản trị) → không gửi phiên (vẫn báo lỗi JS & nhận thông báo)
    let noTrack = false; try { noTrack = localStorage.getItem('lk.noTrack') === '1'; } catch (e) { /* bỏ qua */ }
    const inSample = !noTrack && (parseInt(vid.slice(0, 6), 36) % 1000) < rate * 1000;
    // Gửi bù: /api chết (01/11 hạn mức Workers cạn → 7,9 giờ không ghi được phiên nào) → web cùng nguồn đọc được mã lỗi: 429/5xx/mất mạng
    // → giữ phiên (theo sid, cộng dồn pv) trong lk.hitq; lần gửi thành công sau đó gửi lại với late:1 + t0 (máy chủ ghi vào ngày gốc, ≤ 36 giờ).
    // App/add-on (khác nguồn, phản hồi opaque) vẫn dùng sendBeacon như cũ.
    const Q = 'lk.hitq', qGet = () => { try { return JSON.parse(localStorage.getItem(Q) || '{}') || {}; } catch (e) { return {}; } }, qSet = q => { try { if (Object.keys(q).length) localStorage.setItem(Q, JSON.stringify(q)); else localStorage.removeItem(Q); } catch (e) { /* bỏ qua */ } };
    // hb không xóa pv trong bộ nhớ (lần gửi sau mang lại) → không cộng; bản gửi bù hỏng lần nữa → thay, không cộng lại chính nó
    const park = d => { const q = qGet(), o = !d.late && q[d.sid], p = { ...(o && o.pv) }; if (!d.hb) for (const [k, v] of Object.entries(d.pv || {})) p[k] = (p[k] || 0) + v; q[d.sid] = { ...d, hb: undefined, pv: Object.keys(p).length ? p : undefined, late: 1 }; for (const k of Object.keys(q).filter(k => !(q[k].t0 > Date.now() - 35 * 3600e3)).concat(Object.keys(q).slice(0, -20))) delete q[k]; qSet(q); };
    let replayed = false;
    const sendS = d => {
      if (BASE || !window.fetch) return send(d);
      fetch('/api/hit', { method: 'POST', body: JSON.stringify(d), keepalive: true, mode: 'same-origin' }).then(r => {
        if (r.status === 429 || r.status >= 500) return park(d);
        if (d.late) { const q = qGet(); delete q[d.sid]; qSet(q); }
        if (!replayed) { replayed = true; for (const [k, v] of Object.entries(qGet())) if (k !== sid) sendS(v); }
      }).catch(() => park(d));
    };
    // Nguồn thật: vào /app/ thường đi qua trang tĩnh nên document.referrer là chính mình → mất Google/blog. Ưu tiên: nguồn ngoài trực tiếp → nguồn ngoài trang tĩnh ghi lại ≤ 30 phút (lk.src, site-layout SRC_JS) → site:<đoạn đường dẫn> (máy chủ lọc, xem _cpm.js normRef)
    const ref = (() => { try { const r = document.referrer, u = r && new URL(r); if (u && u.hostname !== location.hostname) return r; const o = JSON.parse(localStorage.getItem('lk.src') || '0'); if (o && o.h && Date.now() - o.t < 18e5) return 'https://' + o.h; if (u) { const a = u.pathname.split('/').filter(Boolean); return 'site:' + ((/^[a-z]{2}$/.test(a[0]) ? a[1] : a[0]) || ''); } } catch (e) { /* bỏ qua */ } return ''; })();
    let lastSent = 0, pv = { [path]: 1 }; // pv: lượt xem từng trang kể từ lần gửi trước (máy chủ cộng dồn vào pageviews_day)
    const flush = (force, hb) => { // hb: nhịp "đang online" 3 phút – máy chủ có thể chỉ ghi Analytics Engine (lượt xem dồn sang lần gửi sau)
      if (since) { dur += (Date.now() - since) / 1000; since = document.visibilityState === 'visible' ? Date.now() : 0; }
      if (!inSample || (!force && Date.now() - lastSent < 60000)) return;
      lastSent = Date.now(); const d = pv; if (!hb) pv = {};
      (document.visibilityState === 'visible' ? sendS : send)({ t: 's', sid, vid, ret, path, cur: cur(), ref, lang: window.I18N ? I18N.lang() : '', dev, plat, dur: Math.round(dur), pages, lcp, pv: Object.keys(d).length ? d : undefined, hb, t0 });
    };
    addEventListener('hashchange', () => { pages++; const r = cur(); if (r in pv || Object.keys(pv).length < 20) pv[r] = (pv[r] || 0) + 1; });
    // "Đang online": gửi 1 lần sau 15 giây rồi nhịp 3 phút/lần khi tab đang hiển thị (ẩn tab → không gửi)
    if (inSample) { setTimeout(() => document.visibilityState === 'visible' && flush(true), 15000); setInterval(() => { if (document.visibilityState === 'visible') flush(true, 1); }, 180000); }
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); else since = Date.now(); });
    addEventListener('pagehide', () => flush(true));
    const err = (msg, src, line) => { if (++errs > 5 || !msg || /ResizeObserver loop|^Script error\.?$/.test(msg)) return; send({ t: 'e', msg: String(msg), src: String(src || '').replace(location.origin, ''), line, path: (location.hash.match(/^#\/([a-z-]+)/) || [, ''])[1] }); };
    addEventListener('error', e => err(e.message, e.filename, e.lineno));
    addEventListener('unhandledrejection', e => { const r = e.reason; err(r && (r.message || String(r)), r && r.stack && (r.stack.split('\n')[1] || '').trim(), 0); });
    // Cấu hình công khai: đệm 1 giờ trên máy (mỗi lần mở trang không gọi Functions)
    const cfg = () => { try { const c = JSON.parse(localStorage.getItem('lk.cfg') || 'null'); if (c && Date.now() - c.at < 3600e3) return Promise.resolve(c.v); } catch (e) { /* bỏ qua */ } return fetch(BASE + '/api/config').then(r => r.ok ? r.json() : {}).then(v => { try { localStorage.setItem('lk.cfg', JSON.stringify({ at: Date.now(), v })); } catch (e) { /* bỏ qua */ } return v; }); };
    setTimeout(() => cfg().then(c => {
      try { if (c.hit_rate) localStorage.setItem('lk.hr', c.hit_rate); else localStorage.removeItem('lk.hr'); } catch (e) { /* bỏ qua */ }
      if (!c.banner) return;
      const key = 'lk.banner.' + c.banner.length + c.banner.slice(0, 20);
      try { if (localStorage.getItem(key)) return; } catch (e) { /* bỏ qua */ }
      const el = document.createElement('div');
      el.className = 'lk-banner ' + (c.banner_level || 'info'); el.setAttribute('role', 'status');
      el.innerHTML = `<span>${esc(c.banner)}</span>${/^https:\/\//.test(c.banner_url || '') ? ` <a href="${esc(c.banner_url)}" target="_blank" rel="noopener">→</a>` : ''}<button type="button" aria-label="${t('Đóng')}">×</button>`;
      el.querySelector('button').onclick = () => { el.remove(); try { localStorage.setItem(key, 1); } catch (e) { /* bỏ qua */ } };
      document.body.prepend(el);
    }).catch(() => {}), 2500);
  })();
  // Script nạp kiểu defer: chờ DOMContentLoaded (lúc mọi script đã chạy xong) rồi mới khởi động app
  if (document.readyState === 'loading' || !window.__lkReady) document.addEventListener('DOMContentLoaded', boot, { once: true }); else setTimeout(boot, 0);
})();
