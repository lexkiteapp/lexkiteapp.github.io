/* Lexkite v2 – khung ứng dụng: router, trạng thái, trang chủ, thư viện, từ điển, sổ từ, tiến độ, cài đặt. */
(function () {
  const { Store, SRS, Cards, Stats, Golden, DEFAULT_SETTINGS, todayKey, endOfToday, DAY } = Core;
  const { TOPICS, INDEX, GROUPS } = IELTS_DATA;
  const { $, $$, esc, highlight, toast, modal, closeModal, speak, pic, levelChip, posChip, ring, download, xpFloat } = UI;
  const view = $('#view');

  const state = { cards: {}, settings: { ...DEFAULT_SETTINGS }, stats: { days: {}, newToday: { day: '', n: 0 } }, game: null, user: null };
  const allWords = () => TOPICS.flatMap(t => t.words);
  const topicOf = id => TOPICS.find(t => t.id === id) || (App.subTopic && App.subTopic(id)); // + bài con lộ trình (path.js)
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
    state.cards = await Cards.all();
    state.settings = { ...DEFAULT_SETTINGS, theme: 'auto', sfx: true, ...(await Store.get('settings', {})) };
    SRS.retentionTarget = state.settings.retention || 0.9;
    // Một lần: sửa lỗi chính tả hỏi/ngã từ dữ liệu Google trong các thẻ đã lưu trước đây
    if (!state.settings.viFix1 && window.Dict && Dict.fixDeep) {
      const all = await Cards.all(); let n = 0;
      for (const c of Object.values(all)) { const f = Dict.fixDeep(c); if (JSON.stringify(f) !== JSON.stringify(c)) { await Cards.update(f); n++; } }
      state.settings.viFix1 = 1; await Store.set('settings', state.settings);
      if (n) state.cards = await Cards.all();
    }
    state.stats = await Stats.get();
    state.game = await Game.get();
    Core.sfxOff = !state.settings.sfx;
    applyTheme();
    updateChrome();
  }
  const saveSettings = async () => { await Store.set('settingsAt', Date.now()); const r = await Store.set('settings', state.settings); if (window.VBNative && VBNative.scheduleReminder) VBNative.scheduleReminder({ ask: !!state.settings.onboarded }); return r; }; // app gốc: đặt lại giờ nhắc học

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
    if (!native && !freeLeft) return;
    const box = modal(`<div class="center">${window.Kit ? Kit.svg('sad', 84, true) : '🥺'}
      <h2 style="margin:.4rem 0">${t('Bạn lỡ quên 1 ngày?')}</h2>
      <p class="muted">${native ? t('Xem 1 video ngắn để khôi phục chuỗi 🔥 {n} ngày!', { n: prev }) : t('Dùng khiên miễn phí (1 lần mỗi tháng) để khôi phục chuỗi 🔥 {n} ngày!', { n: prev })}</p>
      <div class="row center" style="gap:.6rem;margin-top:1rem;flex-wrap:wrap"><button class="btn primary" id="rsYes">${native ? '▶ ' + t('Xem video để cứu chuỗi') : '🛟 ' + t('Dùng khiên cứu chuỗi')}</button><button class="btn ghost" id="rsNo">${t('Chấp nhận bắt đầu lại')}</button></div></div>`);
    $('#rsNo', box).onclick = () => closeModal();
    $('#rsYes', box).onclick = async () => {
      const ok = native ? await Ads.rewarded('streak').catch(() => false) : true;
      if (!ok) { toast(t('Chưa xem hết video – chuỗi chưa được khôi phục')); return; }
      state.game = await Game.mutate(gs => { gs.frozen = { ...(gs.frozen || {}), [y]: 1 }; if (!native) gs.rescueMonth = month; });
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
  const masteredCount = () => Object.values(state.cards).filter(c => SRS.mastery(c.srs) === 3).length;

  function updateChrome() {
    if (!state.game) return; // gọi sớm trước khi nạp xong dữ liệu (vd. đăng nhập gốc trả phiên lúc mở app) – nạp xong sẽ gọi lại
    if (App.updateExamChip) App.updateExamChip();
    const st = streak();
    const fi = (window.Core && Core.Stats && Core.Stats.freezeInfo) ? Core.Stats.freezeInfo(state.game) : { left: +state.game.freezes || 0 };
    const freezeCount = fi.left;
    $('#streakPill').innerHTML = `<i class="flame-icon" aria-hidden="true">${UI.icon('flame')}</i><span>${st}</span>${freezeCount ? `<span class="pill-sub">${UI.icon('snowflake')}${freezeCount}</span>` : ''}`;
    $('#streakPill').setAttribute('aria-label', freezeCount ? t('Chuỗi {n} ngày, {f} lượt đóng băng', { n: st, f: freezeCount }) : t('Chuỗi {n} ngày', { n: st }));
    $('#xpPill').innerHTML = `${UI.icon('star')}<span>${state.game.xp.toLocaleString(I18N.lang())}</span>`;
    const { total } = Cards.dueCount(state.cards, state.settings, state.stats);
    $$('[data-due]').forEach(b => { b.hidden = !total; b.textContent = total > 99 ? '99+' : total; });
    const L = Game.levelOf(state.game.xp);
    const name = state.user ? (state.user.displayName || state.user.email || t('Bạn')) : t('Bạn');
    $('#sideLevel').innerHTML = `<div class="lv-row">${avatarHtml()}<div class="grow"><b>${esc(name)}</b><div class="tiny muted">${t('Cấp {n}', { n: L.level })} · ${esc(L.title)}</div></div></div>
      <div class="progress xp thin" style="margin-top:.6rem"><i style="width:${L.into / L.need * 100}%"></i></div>
      <div class="tiny muted" style="margin-top:.3rem">${t('{a}/{b} XP tới cấp {n}', { a: L.into, b: L.need, n: L.level + 1 })}</div>`;
    if (window.Sync && Sync.chrome) Sync.chrome(); else $('#avatarBtn').innerHTML = avatarInner(); // nút tài khoản đầu trang + thẻ thanh bên (sync.js)
    if (window.VBNative && VBNative.widget) VBNative.widget(state, st); // widget màn hình chính/khóa (chỉ app gốc)
  }
  const avatarInner = () => state.user && state.user.photoURL ? `<img src="${esc(state.user.photoURL)}" alt="" referrerpolicy="no-referrer">` : esc((state.user && (state.user.displayName || state.user.email) || 'L')[0].toUpperCase());
  const avatarHtml = () => `<span class="avatar">${avatarInner()}</span>`;

  // ---------- Theme ----------
  function applyTheme() {
    const t = state.settings.theme;
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
  }
  // Nút 🌐: menu ngôn ngữ js/lang-menu.js (tải lười) → I18N.set
  if ($('#langMenu')) { const cur = I18N.lang(); $('#langCode').textContent = cur.toUpperCase(); $('#langMenu').innerHTML = I18N.SUPPORTED.map(l => `<li role="none"><button type="button" role="menuitemradio" aria-checked="${l === cur}" data-v="${l}" lang="${l}" dir="${l === 'ar' ? 'rtl' : 'ltr'}">${I18N.LANGS[l][1]}</button></li>`).join('');
    $('#langBtn').onclick = () => App.need('lsw').then(() => { if (window.LkLangMenu) { LkLangMenu($('#langBtn').parentNode); $('#langBtn').click(); } }); }
  $('#themeBtn').onclick = () => {
    const order = ['auto', 'light', 'dark'];
    state.settings.theme = order[(order.indexOf(state.settings.theme) + 1) % 3];
    applyTheme(); saveSettings();
    toast({ auto: '🌓 ' + t('Giao diện theo hệ thống'), light: '☀️ ' + t('Giao diện sáng'), dark: '🌙 ' + t('Giao diện tối') }[state.settings.theme]);
  };

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
      if (!c || !navigator.onLine) continue;
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
    state.cards[card.word.toLowerCase()] = card;
    // Thêm lẻ → bổ sung dữ liệu ngay; thêm hàng loạt → để dành tới khi thẻ được ôn (tránh hàng trăm lượt gọi API)
    if (isNew && !silent) enrichLater(card.word.toLowerCase());
    updateChrome();
    if (window.Sync) Sync.schedule();
    if (!silent) Sfx.pop();
    return card;
  }

  // ---------- Router ----------
  const routes = {};
  const App = { enrichLater, ORIGINS, origin, forgetting, state, routes, load, reward, addWord, inDeck, allWords, topicOf, updateChrome, saveSettings, streak, activeDays, masteredCount, masteryDots, view };
  window.App = App;

  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, '') || 'home';
    const [path, qs] = raw.split('?');
    const [name, ...rest] = path.split('/');
    return { name, arg: decodeURIComponent(rest.join('/') || ''), query: new URLSearchParams(qs || '') };
  }
  // ---------- Nạp module theo trang (lazy loading): trang đầu chỉ tải phần lõi, phần nặng tải khi cần ----------
  const G = 'js/grammar/', BUNDLES = {
    grammar: ['js/structures.js', ...['tenses', 'verbs', 'sentences', 'foundation', 'academic', 'chapters', 'book2', 'drills-a', 'drills-b', 'drills-c', 'check'].map(f => G + f + '.js'), 'js/grammar.js'],
    pron: ['js/pron/sounds.js', 'js/pron/skills.js', 'js/pron.js'],
    words: ['js/lib/topics-more.js', 'js/lib/skills.js', 'js/lib/awl.js', 'js/lib/ngsl.js', 'js/lib/ngsl2.js', 'js/lib/office.js', 'js/distract.js'], // 4 kho từ (~145 KB nén) – không chặn trang đầu, tải khi cần/lúc rảnh
    readings: ['js/readings.js', 'js/readings-more.js', 'js/choice-kit.js', 'js/cbt.js', 'js/method.js'], // 30 bài đọc – chỉ tải khi cần (trang chủ tự điền mục "Bài đọc hôm nay")
    voice: ['js/listen/kvoice.js', 'js/listen/audio-index.js'], // danh mục giọng Kokoro: mọi lần phát âm từ/câu dùng giọng chất lượng cao nếu có
    handsfree: ['js/handsfree.js'],
    reflex: ['js/reflex.js'],
    handoff: ['js/lib/qr.js', 'js/handoff.js'], // 📲 chuyển dữ liệu bằng mã QR, không cần đăng nhập (mã hóa trên máy)
    roleplay: ['js/i18n/en/rpbasic.js', 'js/roleplay/data-everyday.js', 'js/roleplay/data-a.js', 'js/roleplay/data-b.js', 'js/roleplay.js'], // Roleplay: 6 tình huống hằng ngày A1–A2 + 10 kịch bản công sở
    call: ['js/call/calls.js', 'js/call.js'], // Call Mia: cuộc gọi luyện nói có kịch bản
    courses: ['js/courses.js'], goal: ['js/goal.js'], // Mục tiêu & kế hoạch: tải lười (khung app chạm trần 380 KB)
    paraphrase: ['js/lib/paraphrase-data.js', 'js/paraphrase.js'],
    listening: ['js/choice-kit.js', 'js/qengine.js', 'js/i18n/en/qtips.js', 'js/qtips.js', ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `js/listen/test${n}.js`), 'js/listen/kvoice.js', 'js/listen/audio-index.js', 'js/listening.js'],
    writing: ['js/write/task2-more.js', 'js/write/task1-more.js', 'js/write/task1-more2.js', 'js/write/ideas.js', 'js/write.js', 'js/task1.js', 'js/models.js', 'js/write/models2.js', 'js/write/models3.js', 'js/write/models4.js', 'js/write/models5.js', 'js/write/gt-letters.js', 'js/letters.js', 'js/ideas.js'],
    mock: ['js/choice-kit.js', 'js/qengine.js', 'js/i18n/en/qtips.js', 'js/qtips.js', 'js/readtest/test1.js', 'js/readtest/test2.js', 'js/readtest/test3.js', 'js/readtest/test4.js', 'js/readtest/test5.js', 'js/readtest/test6.js', 'js/readtest/test7.js', 'js/readtest/test8.js', 'js/readtest/test9.js', 'js/readtest/test10.js', 'js/readtest/explain-a.js', 'js/readtest/explain-b.js', 'js/readtest/explain-c.js', 'js/readtest/explain-d.js', 'js/readtest/explain-e.js', 'js/readtest/explain-f.js', 'js/readtest/explain-g.js', 'js/readtest/gt1.js', 'js/readtest/gt2.js', 'js/readtest/explain-gt.js', 'js/readtest/gt3.js', 'js/mock.js', 'js/rtype.js'],
    tsl: ['js/lib/tsl-a.js', 'js/lib/tsl-b.js', 'js/lib/domain-a.js', 'js/lib/domain-b.js', 'js/lib/exam-vocab.js', 'js/lib/exam-vocab2.js', 'js/lib/exam-vocab3.js', 'js/lib/nawl.js', 'js/lib/bsl.js'],
    speak: ['js/listen/kvoice.js', 'js/listen/audio-index.js', 'js/speak/samples.js', 'js/speak/more2.js', 'js/speak/more3.js', 'js/speak/more.js', 'js/speaking.js'], // Phòng Speaking: chỉ tải khi mở
    qstats: ['js/qengine.js', 'js/i18n/en/qtips.js', 'js/qtips.js'],
    toefl: ['js/choice-kit.js', 'js/qengine.js', 'js/i18n/en/qtips.js', 'js/qtips.js', 'js/toefl/data1.js', 'js/toefl/data2.js', 'js/toefl/data3.js', 'js/toefl/data4.js', 'js/toefl.js'],
    toeic: ['js/choice-kit.js', 'js/qengine.js', 'js/i18n/en/qtips.js', 'js/qtips.js', 'js/toeic/reading1.js', 'js/toeic/reading2.js', 'js/toeic/listening1.js', 'js/toeic/listening2.js', 'js/toeic/reading3.js', 'js/toeic/listening3.js', 'js/toeic/reading4.js', 'js/toeic/listening4.js', 'js/toeic/reading5.js', 'js/toeic/listening5.js', 'js/toeic/reading6.js', 'js/toeic/listening6.js', 'js/toeic/reading7.js', 'js/toeic/listening7.js', 'js/toeic/sw1.js', 'js/toeic.js'],
    nxs: ['js/i18n/en/nextstep.js', 'js/next-step.js'], league: ['js/league.js'], classroom: ['js/i18n/en/classroom.js', 'js/classroom.js'], // 🏫 Lớp học (giáo viên/học sinh)
    criteria: ['js/i18n/en/criteria.js', 'js/criteria.js'],
    resources: ['js/i18n/en/resources.js', 'js/resources.js'], // 🌐 Tài nguyên miễn phí (tách khỏi khung)
    pathx: ['js/i18n/en/pathx.js', 'js/path-reward.js', 'js/tracks.js', 'js/path-mix.js', 'js/path-day.js'], // 🏁 Màn thưởng cuối bước lộ trình (path.js gọi khi xong lượt)
    notices: ['js/i18n/en/notices.js', 'js/notices.js'], // 🔔 Chuông thông báo người học (tải lười sau khi vẽ trang) // 📋 Tiêu chí chấm IELTS Writing & Speaking
    remind: ['js/i18n/en/remind.js', 'js/remind.js'], settings: ['js/settings.js'], // ⚙️ Cài đặt (tách khỏi khung 23/10)
    streak: ['js/streak-ui.js'], struct: ['js/structures.js'], // 🧩 nhận diện cấu trúc (tải lười, ra khỏi khung app 20/10)
    vcore: ['js/verbs-core.js'], verbs: ['js/verbs.js'], fixer: ['js/writecheck-rules.js', 'js/fixer.js'], // 🔤 Chia động từ · ✍️ Sửa ngữ pháp
    uidx: ['js/usage-index.js'], usage: ['js/i18n/en/usage.js', 'js/choice-kit.js', 'js/usage-core.js', 'js/usage.js'], uP: ['js/usage/prep-adj.js', 'js/usage/prep-verb.js', 'js/usage/prep-noun.js'], uV: ['js/usage/verb.js'], uA: ['js/usage/adv.js'], uS: ['js/usage/struct.js'], uC: ['js/usage/pair.js'], // 📘 Cách dùng từ (dữ liệu theo nhóm, usage.js tự gọi App.need)
    placement: ['js/placement.js'], // 🧭 Kiểm tra đầu vào thích ứng (ước tính band + khoảng tin cậy)
    lvideo: ['js/i18n/en/lvideo.js', 'js/lib/video-rank.js', 'js/lesson-video.js'], // 🎬 Video bài học (thẻ từ, ngữ pháp, ngày học) – docs/VIDEO-SCALE-PLAN.md §10
    vimg: ['js/vocab-img.js'], // 🖼️ Ảnh minh họa theo nghĩa – CHỈ tải khi cờ vocab_img bật (App.vimgReady), khung app +0
    wordcard: ['js/wordcard.js'], // 🧠 Khối "Hiểu sâu" của thẻ từ (mẹo nhớ · lỗi sai/đúng · dùng khi thi · họ từ)
    anki: ['js/lib/save-file.js', 'js/anki.js'], // 🃏 Xuất/nhập Anki (.apkg/.txt/.csv) – chỉ tải khi mở hộp thoại Anki
    share: ['js/lib/qr.js', 'js/lib/save-file.js', 'js/share-card.js'], xport: ['js/export.js'], file: ['js/lib/save-file.js'], lsw: ['js/lang-menu.js'],
    quick: ['js/i18n/en/quick.js', 'js/quick.js'],
    pgames: ['js/study-games.js'],
    rmodes: ['js/i18n/en/rmodes.js', 'js/study-modes.js'], // 🔁 Ôn tập đa chế độ (Gõ phản xạ · Nghe chọn nghĩa) + ✍️ thẻ "Câu của bạn" [P2-1.2/P2-1.1-UI]
    swipe: ['js/study-swipe.js'], // ⚡ Ghép thẻ + 🎙️ Phát âm · 👆 vuốt thẻ + 🐦 Kit mini (G2)
    wfeed: ['js/i18n/en/wfeed.js', 'js/widget-feed.js'], // 📱 widget "Từ mỗi giờ" (chỉ app gốc – native.js nạp)
    lfx: ['js/i18n/en/lfx.js', 'js/lesson-fx.js'],
    i18nx: ['structs', 'toefl', 'league', 'call', 'handoff'].map(n => `js/i18n/en/${n}.js`), // chuỗi giao diện trang tải lười (xem App.need)
    confidence: ['js/i18n/en/confidence.js', 'js/confidence/data.js', 'js/confidence.js'], // 🔥 Nhịp buổi học: chuỗi đúng liền, lỗi chính tả nhỏ, Giải thích, thẻ số liệu cuối lượt, tạm tắt nghe/nói, chế độ khó
  };
  const ROUTE_BUNDLE = { confidence: ['roleplay', 'confidence'], settings: ['remind', 'settings'], class: 'classroom', paraphrase: 'paraphrase', courses: 'courses', goal: 'goal', course: 'courses', handsfree: ['words', 'tsl', 'voice', 'handsfree'], reflex: ['words', 'voice', 'readings', 'reflex'], roleplay: 'roleplay', call: 'call', handoff: 'handoff', letters: 'writing', reading: 'readings', read: 'readings', cbt: 'readings', method: 'readings', grammar: ['grammar', 'lfx'], placement: ['words', 'grammar', 'placement'], pron: 'pron', listening: 'listening', listen: ['listening', 'toeic'], 'listen-test': 'listening', dictation: ['listening', 'toeic'],
    toefl: ['listening', 'toefl'], 'toefl-p': ['listening', 'toefl'],
    toeic: ['tsl', 'listening', 'toeic'], qstats: 'qstats', 'toeic-r': ['toeic'], 'toeic-sw': ['toeic'], 'toeic-test': ['listening', 'toeic'], library: ['words', 'tsl'], topic: ['words', 'tsl'], practice: ['words', 'tsl', 'lfx'], dict: ['vcore', 'uidx'], verb: ['vcore', 'verbs', 'uidx'], fix: ['fixer', 'uidx'], usage: ['vcore', 'uidx', 'usage'], write: 'writing', task1: 'writing', model: 'writing', models: 'writing', phrases: 'writing', ideas: 'writing', rtype: 'mock', speaking: 'speak', mock: ['listening', 'writing', 'speak', 'mock'], home: ['words', 'streak'], vocab: 'words', path: ['words', 'pathx'], day: ['words', 'pathx'], review: 'words', deck: 'words', stats: ['words', 'streak'], league: 'league', criteria: 'criteria', resources: 'resources', quick: ['words', 'quick'], style: 'quick'};
  const bundleP = {};
  // Phần nặng tải từ CDN jsDelivr (theo commit); CDN lỗi → máy chủ chính.
  const CDN = (() => { try { if (Store.isExtension || (window.VBNative && VBNative.is)) return null; const el = document.getElementById('vb-cdn'); return el ? JSON.parse(el.textContent) : null; } catch (e) { return null; } })(); // { base: GitHub Pages, files: [file dữ liệu] }
  let cdnDown = false;
  const loadOne = src => new Promise(res => { const s = document.createElement('script'); s.src = src; s.async = false; s.onload = () => res(true); s.onerror = () => res(false); document.head.appendChild(s); });
  const loadScript = async src => {
    const viaCdn = CDN && !cdnDown && CDN.files.includes(src);
    if (viaCdn && await loadOne(CDN.base + src)) {}
    else {
      if (viaCdn) cdnDown = true; // CDN lỗi → từ giờ dùng máy chủ chính cho các file còn lại (giữ đúng thứ tự)
      if (!await loadOne(src)) {
        // Đang triển khai (file tạm trả HTML lỗi) → chờ 1,5 s, thử lại 1 lần, bỏ bộ đệm
        await new Promise(r => setTimeout(r, 1500)); await loadOne(src + (src.includes('?') ? '&' : '?') + 'r=' + Date.now());
      }
    }
    const m = src.match(/^js\/i18n\/en\/([^/]+)\.js$/);
    if (m && window.I18N) { const l = I18N.lang(); if (l !== 'en' && l !== 'vi') await loadOne(`js/i18n/${l}/${m[1]}.js`); }
  };
  // Tải song song nhưng chạy đúng thứ tự (async=false); file thiếu được bỏ qua
  // i18nx: chuỗi giao diện của các trang tải lười (TOEFL, Giải đấu, Call Mia, Chuyển dữ liệu, Cấu trúc câu) – ra khỏi en.js (khung app),
  // nạp kèm (song song) gói đầu tiên được mở → module luôn vẽ khi đã có bản dịch; tiếng Việt (ngôn ngữ gốc) không cần
  const need1 = n => bundleP[n] || (bundleP[n] = Promise.all(BUNDLES[n].map(loadScript)));
  App.need = (...names) => Promise.all([window.I18N && I18N.lang() !== 'vi' ? need1('i18nx') : 0, ...names.map(need1)]);
  App.loaded = n => !!bundleP[n];
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
  // Tải sẵn mọi gói vào bộ đệm trình duyệt KHÔNG thực thi (<link rel=prefetch>, ưu tiên thấp) → trang đầu không bị khựng,
  // vào trang khác thì gói đã có sẵn, chỉ còn bước thực thi.
  App.prefetchAll = () => { if (!Store.isExtension && lean()) return; idle(() => { const have = new Set([...document.querySelectorAll('script[src],link[rel=prefetch]')].map(x => x.getAttribute('src') || x.getAttribute('href'))); [...new Set(Object.values(BUNDLES).flat())].filter(f => typeof f === 'string' && /\.js$/.test(f) && !have.has(f)).forEach(f => { const l = document.createElement('link'); l.rel = 'prefetch'; l.as = 'script'; l.href = f; document.head.appendChild(l); }); }); };


  // Làm mới phiên âm của thẻ lưu từ bản cũ (trước khi chọn IPA theo từ loại): chạy ngầm lúc rảnh, chậm rãi, mỗi thẻ 1 lần
  const IPA_V = 6; // 6: IPA Mỹ theo kho
  App.refreshIPA = () => refreshIPA();
  async function refreshIPA() {
    if (!navigator.onLine || !window.Dict) return;
    const map = await Cards.all(), todo = Object.values(map).filter(x => x.word && (x.ipaV || 0) < IPA_V).slice(0, 150);
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
      await Cards.patch(w, x => { x.ipaV = IPA_V; if (ipa) { x.ipa = ipa; if (ipaUS || fromLib) x.ipaUS = ipaUS; } });
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
  async function route() {
    const my = ++routeSeq; // token của lượt này
    held = false;
    scope.ac.abort(); scope = { id: my, ac: new AbortController() };
    if (!state.game) { await dataReadyP; if (my !== routeSeq) return; }
    const { name, arg, query } = parseHash();
    const STUDY = /^#\/(practice\/|review)/;
    if (STUDY.test(location.hash) && curHash && !STUDY.test(curHash)) backHash = /^#\/welcome/.test(curHash) ? '#/home' : curHash;
    else if (!STUDY.test(location.hash)) backHash = '';
    curHash = location.hash;
    const b = [].concat(ROUTE_BUNDLE[name] || []);
    // Khung chờ (skeleton) chỉ hiện khi tải lâu hơn 150 ms → không nháy màn hình khi tải nhanh
    let skel = null;
    if (b.some(x => !App.loaded(x))) skel = setTimeout(() => {
      const skelReview = `<div class="study-wrap skel-study" aria-busy="true" aria-label="${t('Đang tải…')}"><div class="study-top"><div class="skel" style="width:32px;height:32px;border-radius:50%"></div><div class="skel" style="flex:1;height:12px;border-radius:6px"></div><div class="skel" style="width:70px;height:14px;border-radius:4px"></div></div><div class="skel-card-body"><div class="skel" style="width:45%;height:2.4rem;border-radius:10px"></div><div class="skel" style="width:30%;height:1.2rem;border-radius:6px"></div><div class="skel" style="width:75%;height:1.2rem;border-radius:6px;margin-top:.4rem"></div><div class="skel" style="width:85%;height:1rem;border-radius:6px"></div><div class="row center" style="gap:.8rem;width:100%;max-width:320px;margin-top:1.2rem"><div class="skel" style="height:44px;flex:1;border-radius:999px"></div><div class="skel" style="height:44px;flex:1;border-radius:999px"></div></div></div></div>`;
      const skelHome = `<div class="skel-page skel-home" aria-busy="true" aria-label="${t('Đang tải…')}"><div class="today-head"><div class="skel" style="width:52px;height:52px;border-radius:50%;flex:none"></div><div class="grow" style="display:grid;gap:.5rem"><div class="skel skel-h" style="width:40%;height:1rem"></div><div class="skel skel-l" style="width:75%;height:1.3rem"></div></div><div class="skel" style="width:88px;height:34px;border-radius:999px;flex:none"></div></div><div class="skel" style="height:110px;border-radius:18px"></div><div class="skel" style="height:150px;border-radius:18px"></div><div class="skel" style="height:130px;border-radius:18px"></div></div>`;
      const skelDefault = `<div class="skel-page" aria-busy="true" aria-label="${t('Đang tải…')}"><div class="skel skel-h"></div><div class="skel skel-l"></div><div class="skel-grid">${'<div class="skel skel-card"></div>'.repeat(4)}</div></div>`;
      view.innerHTML = name === 'review' ? skelReview : name === 'home' || !name ? skelHome : skelDefault;
    }, 150);
    if (b.length) { try { await App.need(...b); } catch (e) { if (my === routeSeq) errState(); throw e; } finally { clearTimeout(skel); } if (my !== routeSeq) return; }
    if (!routes[name] && ROUTE_ALIAS[name]) { location.replace(location.pathname + location.search + '#/' + [ROUTE_ALIAS[name], arg && encodeURIComponent(arg)].filter(Boolean).join('/') + (query.toString() ? '?' + query : '')); return; } // gõ nhầm quen thuộc (#/wellcom…) → trang đúng
    const fn = routes[name] || (name ? notFound : routes.home);
    // Đánh dấu mục đang mở: thanh dưới theo 5 mục chính, menu bên theo mục con; nhóm chứa trang hiện tại tự mở
    const [tab, item] = App.navOf ? App.navOf(name, arg) : [name, name];
    $$('#bnav a').forEach(a => { const on = a.dataset.tab === tab; a.classList.toggle('active', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); });
    document.body.classList.toggle('focus', name === 'review' || (name === 'practice' && !!arg)); // đang ôn/luyện → tập trung 100% vào thẻ
    $$('#nav a[data-route]').forEach(a => { const on = a.dataset.route === item; a.classList.toggle('active', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'); });
    $$('#nav .nav-group').forEach(gp => { const on = gp.dataset.tab === tab; gp.classList.toggle('current', on); if (on) gp.open = true; });
    UI.stopSpeak(); UI.clearRecs();
    document.onkeydown = null;
    if (App.cleanup) { try { App.cleanup(); } catch (e) { /* bỏ qua */ } App.cleanup = null; }
    while (App.cleanups.length) { try { App.cleanups.pop()(); } catch (e) { /* một hàm lỗi không chặn các hàm khác */ } }
    // Chuyển trang mượt (View Transitions – Chrome/Edge/Safari mới); máy cũ: hiệu ứng mờ dần sẵn có
    const render = async () => {
      window.scrollTo(0, 0); const preTitle = document.title;
      try { await fn(arg, query); } catch (e) { if (my !== routeSeq || (e && e.name === 'AbortError')) return; if (!view.querySelector(':scope > :not(.skel-page):not(.skel-study)')) errState(); throw e; } // lượt cũ lỗi vì bị hủy → im lặng
      // Đường dẫn "Kỹ năng › Nghe" ở đầu trang con → luôn biết mình đang ở đâu, 1 chạm quay lại trang trung tâm
      const c = my === routeSeq && App.crumb && App.crumb(name, arg), ph = c && view.querySelector('.page-head');
      if (ph && !ph.querySelector('.crumb')) ph.insertAdjacentHTML('afterbegin', c);
      if (my === routeSeq) { drawn = { tok: my, hash: location.hash }; markActivity(name, arg); a11yRoute(name, preTitle); if (App.afterRoute) App.afterRoute(name); }
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
  function errState() {
    const off = !navigator.onLine;
    view.innerHTML = `<div class="card err-state" role="alert"><span class="err-ic">${UI.icon(off ? 'globe' : 'compass')}</span><h1>${t('Không tải được – thử lại sau')}</h1>${off ? `<p class="muted">${t('Mất kết nối – vẫn ôn tập được, tra từ mới cần mạng')}</p>` : ''}<div class="row center"><button class="btn primary" data-retry>${t('Thử lại')}</button><a class="btn" href="#/home">${t('Hôm nay')}</a></div></div>`;
    const r = view.querySelector('[data-retry]'); if (r) r.onclick = () => route();
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
  // 🖼️ Ảnh minh họa theo nghĩa (cờ vocab_img: true/false ghi đè, chưa đặt = TỰ ĐỘNG bật khi chỉ mục có ≥ 150 ảnh đã chấm; thử: localStorage lk.vimg=1 – docs/LEXICON.md § Ảnh minh họa). Tắt → không tải gì, không hộp.
  // Bật → tải trước module + chỉ mục lúc mở app; App.vimg() đồng bộ chỉ trả hộp cố định khi chỉ mục đã về và nghĩa có ảnh (CLS 0).
  const vimgOn = () => { try { const f = localStorage.getItem('lk.vimg'); if (f === '1' || f === '0') return f === '1'; const c = JSON.parse(localStorage.getItem('lk.cfg') || 'null'), v = c && c.v && c.v.vocab_img; if (v === false || v === '0' || v === 'false') return false; if (localStorage.getItem('lk.vimg.adm') === '1' || v === '1' || v === true) return true; const p = c && c.v && c.v.vocab_img_pct, pct = p != null && p !== '' && !isNaN(+p) ? +p : 10, b = localStorage.getItem('lk.vb'); return b == null || +b < pct; } catch (e) { return false; } };   // bật dần: nhóm lk.vb < vocab_img_pct (mặc định 10 %) – module tự quyết lần đầu (tạo lk.vb)   // chưa đặt = tự động: module + chỉ mục nhỏ tự quyết (on ≥ 150 ảnh)
  App.vimgReady = () => (vimgOn() ? App.need('vimg').then(() => window.VImg && VImg.ready()).catch(() => null) : Promise.resolve(null));
  App.vimg = (word, pos, gloss, w, ex) => (window.VImg ? VImg.slot(word, pos, gloss, w, ex) : ''); // w = vai (card|back|quiz|dict|words) hoặc px; ex = câu ví dụ (ảnh cảnh)
  App.vimgReady();
  App.notesHtml = word => `<div class="wn-slot" data-notes="${esc(String(word || '').toLowerCase())}"></div>`;
  const fillNotes = () => document.querySelectorAll('.wn-slot[data-notes]:not([data-done])').forEach(el => { el.dataset.done = 1; const w = el.dataset.notes; Promise.all([notesFile(w), App.need('wordcard').then(() => window.WordCard && WordCard.ready)]).then(([m]) => { const n = Object.hasOwn(m, w) && m[w]; if (n && el.isConnected && window.WordCard) el.innerHTML = WordCard.notes(n, w); }).catch(() => {}); });
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
  App.meanOf = x => { if (!x) return ''; if (I18N.meanLang() === 'vi') return x.vi || x.def || ''; return (I18N.lang() !== 'en' && App.nativeGloss && App.nativeGloss(x.word, x.pos)) || x.def || ''; };
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
    let timer = 0, busy = false;
    // Bản dịch SẴN do CI tạo (scripts/gen-content-i18n.mjs, CDN) → hiện ngay đúng ngôn ngữ; chỉ câu chưa có mới dịch máy lúc chạy
    let pre = null; const preP = fetch((/(^|\.)lexkite\.(com|pages\.dev)$/.test(location.hostname) || (window.VBNative && VBNative.is) ? '' : 'https://lexkite.com') + '/i18n/content/' + to + '.json') // app gốc: file nằm sẵn trong gói (www/i18n/content) → dùng được khi offline
      .then(r => (r.ok ? r.json() : {})).catch(() => ({})).then(j => (pre = j || {}));
    const got = k => mem[k] || (pre && pre[k]) || ''; // bản dịch sẵn không ghi vào localStorage (giữ bộ nhớ máy nhẹ)
    async function pass() {
      if (busy) return; busy = true;
      try {
        if (!pre) await Promise.race([preP, new Promise(r => setTimeout(r, 1500))]);
        const nodes = [], tw = document.createTreeWalker(view, NodeFilter.SHOW_TEXT); let n;
        while ((n = tw.nextNode())) { const s = n.nodeValue.trim().replace(/\s+/g, ' '); if (s.length > 1 && VI.test(s) && (!n.parentElement.closest(SKIP) || n.parentElement.closest('.wn, [translate="yes"]'))) nodes.push(n); /* ghi chú từ (.wn) luôn được dịch cho người học quốc tế */ }
        const need = [];
        // Thuộc tính hiển thị (tooltip, nhãn trợ năng, gợi ý ô nhập) cũng phải theo ngôn ngữ người dùng
        const attrs = []; view.querySelectorAll('[title],[aria-label],[placeholder]').forEach(el => { if (el.closest(SKIP) && !el.matches('input,textarea')) return; ['title', 'aria-label', 'placeholder'].forEach(a => { const v = el.getAttribute(a); if (v && VI.test(v)) attrs.push([el, a, v.trim()]); }); });
        attrs.forEach(([el, a, v]) => { if (got(v)) el.setAttribute(a, got(v)); else if (!need.includes(v)) need.push(v); });
        const put = x => { const s = x.nodeValue.trim().replace(/\s+/g, ' '); if (!got(s)) return false; const m = x.nodeValue.match(/^\s*/)[0], e = x.nodeValue.match(/\s*$/)[0]; x.nodeValue = m + got(s) + e; return true; };
        nodes.forEach(x => { if (!put(x)) { const s = x.nodeValue.trim().replace(/\s+/g, ' '); if (!need.includes(s)) need.push(s); } });
        for (let i = 0; i < need.length;) { // lô ≤ 1800 ký tự
          const batch = []; let len = 0; while (i < need.length && len + need[i].length < 1800) { batch.push(need[i]); len += need[i].length + 1; i++; } if (!batch.length) batch.push(need[i++]);
          const r = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=vi&tl=${to}&dt=t&q=${encodeURIComponent(batch.join('\n'))}`).then(x => x.json()).catch(() => null);
          if (!r || !r[0]) break;
          const out = r[0].map(x => x[0]).join('').split('\n');
          batch.forEach((s, k) => { if (out[k] && out[k].trim()) mem[s] = out[k].trim(); });
        }
        if (need.length) { save(); nodes.forEach(put); attrs.forEach(([el, a, v]) => { if (got(v)) el.setAttribute(a, got(v)); }); }
        // Ghi chú học từ (soạn tiếng Việt): chỉ hiện khi đã dịch hết sang ngôn ngữ người học – không lộ tiếng Việt khi dịch chậm/lỗi
        view.querySelectorAll('.wn.wn-tr, .tr-wait').forEach(el => { if (!VI.test(el.textContent)) el.classList.remove('wn-tr', 'tr-wait'); });
      } finally { busy = false; }
    }
    new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(pass, 120); }).observe(view, { childList: true, subtree: true, characterData: false });
  })();
  document.addEventListener('change', e => { if (e.target.matches && e.target.matches('[data-whisper]')) { state.settings.whisperMode = e.target.checked; saveSettings(); if (e.target.checked) toast(t('Hãy đeo tai nghe và nói thì thầm vào micro – không làm phiền người xung quanh.'), 4500); } });
  window.addEventListener('hashchange', route);
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href^="#/"]');
    if (a && a.getAttribute('href') === location.hash) { e.preventDefault(); route(); }
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
          const r = await fetch(`https://api.datamuse.com/sug?s=${encodeURIComponent(q)}&max=8`).then(r => r.json());
          if (my !== seq) return;
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
        <div class="grow"><div class="row"><h3 style="margin:0">${esc(r.title)}</h3>${levelChip(r.level)}</div><div class="muted small">${esc(r.summaryVi)}</div></div>
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
      <section class="card today-card" id="todayPlan" aria-busy="true"><div class="skel skel-l"></div><div class="skel skel-l"></div><div class="skel skel-l"></div></section>
      ${ringsHtml()}
      <div id="leagueHomeCard"></div>
      <a class="card hover hub-card quick-play-card" href="#/quick"><span class="hub-ic" aria-hidden="true">${UI.icon('zap')}</span><span class="hub-tx"><b>${t('Chơi nhanh 15 giây')}</b><small>${t('4 câu cực ngắn · Không sợ sai, giữ phản xạ')}</small></span><span class="chip ok">${t('Chơi ngay')} →</span></a>
      <a class="card hover hub-card" href="#/confidence"><span class="hub-ic" aria-hidden="true">${UI.icon('message-circle')}</span><span class="hub-tx"><b>${t('Giao tiếp tự tin')}</b><small>${t('Nói tự tin trong tình huống thật · 5–8 phút/bài')}</small></span><span class="chev" aria-hidden="true">›</span></a>
      ${(() => { const a = App.lastActivity(); return a ? `<a class="card hover hub-card resume" href="${esc(a.href)}"><span class="hub-ic" aria-hidden="true">${/^[a-z][a-z-]*$/.test(a.em) ? UI.icon(a.em) : a.em}</span><span class="hub-tx"><small>${t('Tiếp tục bài đang học')}</small><b>${esc(a.title)}</b></span><span class="btn sm">${t('Mở lại')} →</span></a>` : ''; })()}
      <a class="quest-line small" href="#/stats?s=quests">${UI.icon('medal')} ${t('Nhiệm vụ hôm nay: {a}/{b}', { a: doneQ.length, b: quests.length })} · ${quests.filter(q => !doneQ.includes(q.id)).map(q => UI.glyph(q.icon)).join(' ')} <span aria-hidden="true">›</span></a>
      <div class="card wotd wotd-sm">
        ${pic(w)}
        <div>
          <div class="tiny muted" style="font-weight:700;text-transform:uppercase;letter-spacing:.06em">${t('Từ của ngày')}</div>
          <div class="row"><a class="wotd-w" href="#/dict/${encodeURIComponent(w.word)}" style="font-size:1.3rem;font-weight:800;color:var(--text)">${esc(w.word)}</a>${posChip(w.pos)}${levelChip(w.level)}<span class="ipa small">${esc(w.ipa)}</span><button class="icon-btn sm" data-speak="${esc(w.word)}" aria-label="${t('Nghe')}">🔊</button></div>
          <div class="vi">${esc(App.meanOf(w))}</div>
          <div class="row" style="margin-top:.4rem">${inDeck(w.word) ? `<span class="chip ok">✓ ${t('Đã có trong sổ')}</span>` : `<button class="btn sm" data-add-seed="${esc(w.word)}">+ Flashcard</button>`}</div>
        </div>
      </div>
      ${window.Ads ? Ads.slot('home') : ''}
    `;
    bindCommon();
    const drawLeague = () => { const el = $('#leagueHomeCard'); if (el && window.League) League.renderHomeCard(el); };
    if (window.League) drawLeague();
    else if (App.need) App.lazy('league').then(drawLeague).catch(() => {});
    if (window.StreakUI) StreakUI.checkSavedNotice(state.game);
    if (App.todayPlan) App.todayPlan().then(tasks => {
      const el = $('#todayPlan'); if (!el) return;
      el.removeAttribute('aria-busy');
      const n = tasks.filter(x => x.done).length, next = tasks.find(x => !x.done), mins = tasks.filter(x => !x.done).reduce((a, x) => a + (x.mins || 0), 0);
      if (!next) {
        el.innerHTML = `<div class="today-done">${window.Kit ? Kit.svg('win', 72, true) : '🎉'}<h2>${t('Xong kế hoạch hôm nay!')} 🎉</h2><p class="muted">${t('Ngày mai quay lại để giữ chuỗi nhé. Muốn học thêm?')}</p>
          <div class="row center"><a class="btn" href="#/practice">⚡ ${t('Trò chơi từ vựng')}</a><a class="btn" href="#/skills">🎯 ${t('Luyện thêm kỹ năng')}</a></div></div>`;
        const ks = $('#kitSay'); if (ks) ks.textContent = t('Xong mục tiêu hôm nay rồi! Giỏi quá 🎉');
        return;
      }
      // Kiểu Duolingo/Busuu: 1 hành động chính ngay dưới tiêu đề (luôn trên màn hình đầu), danh sách việc bên dưới
      el.innerHTML = `<div class="row between nowrap"><div><h2 style="margin:0">${t('Kế hoạch hôm nay')}</h2><div class="muted small">${t('{a}/{b} việc', { a: n, b: tasks.length })}${mins ? ' · ≈ ' + t('{m} phút', { m: mins }) : ''}</div></div>${ring(Math.round(n / tasks.length * 100), n + '/' + tasks.length, 'var(--primary)')}</div>
        <a class="btn primary lg block today-cta" href="${next.href}">${next.day ? (next.started ? t('Tiếp tục Ngày {n}', { n: next.day }) : t('Bắt đầu Ngày {n}', { n: next.day })) + (next.track ? ' · ' + esc(next.track) : '') + ' · ≈ ' + t('{m} phút', { m: next.mins }) : n ? t('Tiếp tục: {step}', { step: esc(next.t) }) : t('Bắt đầu: {step}', { step: esc(next.t) })} →</a>${next.sw || ''}
        <div class="plan">${tasks.map(x => `<a class="plan-item ${x.done ? 'done' : ''} ${x === next ? 'next' : ''}" href="${x.href}"${x === next ? ' aria-current="step"' : ''}><span class="pi-em" aria-hidden="true">${UI.glyph(x.done ? 'circle-check' : x.em)}</span><div class="grow"><b>${esc(x.t)}</b><div class="small muted">${esc(x.sub || '')}</div></div>${x.mins && !x.done ? `<span class="pi-min">${t('{m} phút', { m: x.mins })}</span>` : ''}</a>`).join('')}</div>`;
    });
  };

  // Khối thống kê cũ của trang chủ → trang Tiến độ
  function drawGolden(el) {
      if (!el) return;
      const now = Golden.dueNow(state.cards);
      const nx = Golden.next(state.cards);
      if (now) {
        el.innerHTML = `<div class="row nowrap"><div style="font-size:2.4rem">${UI.icon('alarm-clock')}</div><div class="grow"><h3 style="margin:0">${t('Đang là thời điểm vàng!')}</h3>
          <div class="muted small">${t('<b style="color:var(--again)">{n} từ</b> đang ở thời điểm sắp quên – ôn ngay để nhớ lâu nhất.', { n: now })}</div></div></div>
          <a class="btn primary block" style="margin-top:.8rem" href="#/review">${t('Ôn {n} từ ngay →', { n: now })}</a>`;
      } else if (nx) {
        const ms = nx.at - Date.now(), h = Math.floor(ms / 3600000), m = Math.ceil(ms % 3600000 / 60000);
        el.innerHTML = `<div class="row nowrap"><div style="font-size:2.4rem">${UI.icon('hourglass')}</div><div class="grow"><h3 style="margin:0">${t('Thời điểm vàng tiếp theo')}</h3>
          <div class="muted small">${t('Còn <b style="color:var(--primary);font-size:1.1rem">{time}</b> · {n} từ sẽ cần ôn', { time: h ? t('{h} giờ {m} phút', { h, m }) : t('{m} phút', { m }), n: nx.count })}</div></div></div>
          <p class="small muted" style="margin:.6rem 0 0">${t('Lexkite sẽ nhắc bạn đúng lúc từ sắp bị quên. Trong lúc chờ, hãy học thêm từ mới hoặc chơi Ghép thẻ.')}</p>`;
      } else {
        const fresh = Cards.dueCount(state.cards, state.settings, state.stats).newCount;
        el.innerHTML = `<div class="row nowrap"><div style="font-size:2.4rem">${UI.icon('sprout')}</div><div><h3 style="margin:0">${t('Chưa có lịch ôn')}</h3><div class="muted small">${t('Học từ mới đầu tiên – Lexkite sẽ tự tính “thời điểm vàng” để nhắc bạn ôn đúng lúc sắp quên.')}</div></div></div>
          <div class="row" style="margin-top:.9rem">${fresh ? `<a class="btn primary" href="#/review">✨ ${t('Học {n} từ mới ngay', { n: fresh })}</a>` : `<a class="btn primary" href="#/library">📚 ${t('Chọn bộ từ')}</a>`}<a class="btn" href="#/method">${t('Thời điểm vàng là gì?')}</a></div>
          <div class="tiny muted" style="margin-top:.8rem">${t('Đường cong quên lãng: sau 1 ngày bạn quên ~50% từ mới học – ôn đúng lúc giúp nhớ gần như mãi mãi.')}</div>`;
      }
    }

  function weekSummary(el) {
      const D = state.game.days || {}, sum = (from, n) => { const o = { newWords: 0, reviews: 0, quizzes: 0, xp: 0, active: 0 }; for (let i = 0; i < n; i++) { const d = new Date(from); d.setDate(d.getDate() - i); const x = D[todayKey(d)]; if (x) { o.newWords += x.newWords || 0; o.reviews += x.reviews || 0; o.quizzes += x.quizzes || 0; o.xp += x.xp || 0; if (x.xp || x.reviews) o.active++; } } return o; };
      const now = new Date(), dow = (now.getDay() + 6) % 7, cur = sum(now, dow + 1), lastEnd = new Date(now); lastEnd.setDate(now.getDate() - dow - 1); const prev = sum(lastEnd, 7);
      if (!prev.xp && !cur.xp) return;
      const cell = (em, label, a, b) => { const d = a - b; return `<div class="wk-cell"><span>${UI.glyph(em)}</span><b>${a}</b><small>${label}</small>${b || a ? `<i class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '▲' : '▼'} ${Math.abs(d)}</i>` : ''}</div>`; };
      if (!el) return;
      el.innerHTML = `<div class="card" style="margin-top:1rem"><div class="row between"><b>${UI.icon('calendar')} ${t('Tuần này của bạn')}</b><span class="tiny muted">${t('so với cả tuần trước')}</span></div>
        <div class="wk-grid">${cell('✨', t('Từ mới'), cur.newWords, prev.newWords)}${cell('🔁', t('Lượt ôn'), cur.reviews, prev.reviews)}${cell('🎯', t('Bài luyện'), cur.quizzes, prev.quizzes)}${cell('🔥', t('Ngày học'), cur.active, prev.active)}</div></div>`;
  }

  function levelBars() {
    const n = [0, 0, 0, 0, 0, 0];
    Object.values(state.cards).forEach(c => n[SRS.level5(c.srs)]++);
    if (!n.slice(1).some(Boolean)) return `<div class="empty" style="padding:1.2rem .5rem"><div style="font-size:2rem">${UI.icon('signal')}</div><div class="small">${t('Từ của bạn sẽ đi qua <b>5 cấp độ nhớ</b>: từ “mới học” (cấp 1) đến “nhớ lâu dài” (cấp 5) sau mỗi lần ôn đúng lúc.')}</div><div class="row center" style="margin-top:.6rem;gap:.3rem">${[1, 2, 3, 4, 5].map(i => `<span class="chip">${t('Cấp {n}', { n: i })}</span>`).join('→')}</div></div>`;
    const max = Math.max(1, ...n.slice(1));
    const col = ['', '#e5484d', '#f59e0b', '#eab308', '#22c55e', '#0ea5a4'];
    const lab = ['', t('< 1 ngày'), t('1–3 ngày'), t('4–10 ngày'), t('11–30 ngày'), t('> 1 tháng')];
    return `<div class="bars" style="height:130px;margin-top:.8rem">${[1, 2, 3, 4, 5].map(i => `<a href="#/practice/learn?src=level:${i}" title="${t('Cấp {n}: {range} – bấm để ôn', { n: i, range: lab[i] })}" style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:4px;height:100%;color:var(--text)">
      <em>${n[i]}</em><i style="height:${n[i] ? Math.max(8, n[i] / max * 80) : 3}px;background:${n[i] ? col[i] : 'var(--line)'};width:100%;max-width:34px;border-radius:8px 8px 3px 3px"></i><small style="font-weight:800">${t('Cấp {n}', { n: i })}</small></a>`).join('')}</div>
      <div class="tiny muted center" style="margin-top:.4rem">${t('{n} từ chưa học · bấm vào cột để ôn theo cấp', { n: n[0] })}</div>`;
  }

  function modeTiles() {
    return [
      ['learn', '🧠', t('Học thông minh'), t('Trắc nghiệm → gõ từ, thích ứng theo bạn'), '#ecebff'],
      ['match', '⚡', t('Ghép thẻ'), t('Ghép từ với nghĩa thật nhanh'), '#fff4dc'],
      ['speak', '🎙️', t('Luyện phát âm'), t('Nói vào micro, chấm điểm ngay'), '#fde8f3'],
      ['mcq', '🧩', t('Trắc nghiệm'), t('Chọn nghĩa đúng'), '#e3f7ea'],
      ['cloze', '✍️', t('Điền từ'), t('Hoàn thành câu IELTS'), '#dff6f5'],
      ['listen', '🎧', t('Nghe & chép'), t('Nghe phát âm, gõ lại'), '#e6f0ff'],
      ['handsfree', '🎧', t('Học rảnh tay'), t('Nghe liên tục, khóa màn hình vẫn học'), '#fdf2e9'],
      ['reflex', '⚡', t('Phản xạ 60 giây'), t('Nghe câu ngắn, nhại lại, chấm từng từ'), '#eef6ff'],
      ['test', '📝', t('Bài kiểm tra'), t('20 câu tổng hợp, chấm điểm'), '#f3e8ff'],
      ['write', '✍️', t('Phòng viết'), t('Viết Task 2, phân tích từ vựng'), '#fff1e6'],
      ['speaking', '🗣️', t('Phòng Speaking'), t('Part 1–3, ghi âm, chấm từ vựng'), '#e0f2fe'],
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
    const syncUrl = () => history.replaceState(null, '', location.pathname + location.search + `#/library?g=${$('#libTabs .on').dataset.g}${lvf ? '&lv=' + lvf : ''}`);
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
              ${w.ipa ? `<span class="ipa small">${esc(w.ipa)}</span>` : ''}<button class="icon-btn sm" data-speak="${esc(w.word)}" aria-label="${t('Phát âm')}">🔊</button></div>
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

  // ================= TỪ ĐIỂN =================
  const lookedUp = new Set();
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
  routes.dict = App.guard(async function (q) {
    const fastP = q ? Dict.quick(q) : null, vimgP = App.vimgReady(); // tra song song với đọc 'recent' (từ trong kho: vài ms) + chỉ mục ảnh (cờ bật)
    const w = App.W, recent = await w(Store.get('recent', []));
    view.innerHTML = `
      <div class="page-head"><div><h1>${t('Từ điển Anh – Việt')}</h1><p class="muted">${t('Định nghĩa Oxford Languages · phiên âm UK/US · câu song ngữ · collocation · từ liên quan')}</p></div></div>
      <form class="search" id="searchForm" autocomplete="off">
        <input class="input" id="q" placeholder="${t('Nhập từ tiếng Anh, ví dụ: sustainable')}" value="${esc(q)}" spellcheck="false" autocapitalize="off" autocorrect="off">
        <button class="btn primary lg">${t('Tra từ')}</button>
      </form>
      ${recent.length ? `<div class="row small" style="margin-top:.7rem"><span class="muted">${t('Gần đây:')}</span>${recent.map(r => `<a class="chip" href="#/dict/${encodeURIComponent(r)}">${esc(r)}</a>`).join('')}</div>` : ''}
      <div id="result" style="margin-top:1.25rem"></div>
      <div class="ext-card" data-ext-cta="app" hidden><div><b>🧩 ${t('Tra từ ngay trên mọi trang web')}</b><p class="small muted">${t('Bấm đúp vào bất kỳ từ nào khi đọc để xem nghĩa, phiên âm và lưu vào flashcard – với add-on Lexkite cho Chrome.')}</p></div><a class="btn sm primary" data-ext-cta="app" hidden>${t('Thêm vào Chrome')}</a></div>`;
    extCta();
    $('#searchForm').onsubmit = e => { e.preventDefault(); const v = $('#q').value.trim(); if (v) location.hash = `#/dict/${encodeURIComponent(v)}`; };
    if (!q) {
      $('#q').focus();
      const sample = ['resilient', 'mitigate', 'phenomenon', 'detrimental', 'ubiquitous', 'paradigm'];
      $('#result').innerHTML = `<div class="card empty"><div class="em">📖</div><h3>${t('Tra bất kỳ từ tiếng Anh nào')}</h3><p>${t('Phiên âm UK/US, nghĩa tiếng Việt theo từ loại, định nghĩa Oxford Languages, câu ví dụ song ngữ, hình minh họa — rồi lưu vào flashcard kèm câu ngữ cảnh của riêng bạn.')}</p>
        <div class="row center" style="margin-top:1rem">${sample.map(s => `<a class="chip" href="#/dict/${s}">${s}</a>`).join('')}</div>
        <p class="small" style="margin-top:1rem">💡 ${t('Cài <b>add-on Chrome</b> để bấm đúp vào từ hoặc bôi đen câu trên bất kỳ trang web nào.')}</p></div>`;
      return;
    }
    $('#result').innerHTML = UI.skel(t('Đang tra “{q}”…', { q: esc(q) }), 4); // khung chờ hình mục từ (từ · phiên âm · nghĩa) thay vì ⏳
    // Hiện kết quả nhanh trước (nghĩa, phiên âm), rồi bổ sung âm thanh, hình, câu ví dụ
    let spoke = false;
    const same = () => Dict.normWord(parseHash().arg) === Dict.normWord(q);
    const fast = await w(fastP); await vimgP;
    if (!same()) return;
    if (fast) paint(fast, false);
    const full = await w(Dict.lookup(q));
    if (!same()) return;
    if (!full || !full.found) {
      if (!fast) $('#result').innerHTML = `<div class="card empty"><div class="em">🤔</div><p>${t('Không tìm thấy “{q}”.', { q: esc(q) })}${full && full.vi ? ' ' + t('Gợi ý dịch: <b>{vi}</b>', { vi: esc(full.vi) }) : ''}</p><p class="small">${t('Kiểm tra chính tả hoặc kết nối mạng.')}</p></div>`;
      return;
    }
    Store.set('recent', [full.word, ...recent.filter(r => r !== full.word)].slice(0, 8));
    const lk = todayKey() + ':' + full.word;
    if (!lookedUp.has(lk)) { lookedUp.add(lk); reward({ lookups: 1 }); }
    extCta().then(x => x && x.lookup({ text: t('Bạn vừa tra vài từ. Với add-on Lexkite, bạn tra được ngay trên mọi trang web mình đọc – miễn phí.'), btn: t('Thêm vào Chrome'), close: t('Đóng') }));
    paint(full, true);

    function paint(e, final) {
    const keep = $('#ctx') ? $('#ctx').value : '';
    const card = state.cards[e.word];

    const vh = App.vimg(e.word, e.pos, App.meanOf(e), { w: 'dict', photo: true }, [].concat(e.ex || [])[0] || ''); // hộp ảnh tra từ cố định 160 px (vai dict) – có ảnh thì điện thoại xếp dọc (cột 84 px của ảnh cũ sẽ bóp hộp)
    $('#result').innerHTML = `
      <div class="card">
        <div class="entry-head${vh ? ' has-vimg' : ''}">
          <div>
            <div class="row"><span class="entry-word">${esc(e.word)}</span>${posChip(e.pos)}${levelChip(e.level)}${e.from ? `<span class="chip" data-from lang="en">${esc(e.from)} → ${esc(e.word)}</span>` : ''}</div>
            <div class="pron">
              <span><b class="small">🇬🇧 UK</b> <span class="ipa">${esc(e.ipa || '—')}</span><button class="icon-btn sm" data-speak="${esc(e.word)}" data-accent="en-GB" data-url="${esc(e.audio && /-uk/.test(e.audio) ? e.audio : '')}" aria-label="${t('Nghe giọng Anh–Anh')}">🔊</button></span>
              <span><b class="small">🇺🇸 US</b> <span class="ipa">${esc(e.ipaUS || e.ipa || '—')}</span><button class="icon-btn sm" data-speak="${esc(e.word)}" data-accent="en-US" data-url="${esc(e.audioUS || '')}" aria-label="${t('Nghe giọng Anh–Mỹ')}">🔊</button></span>
              <span><b class="small">🐢 ${t('Chậm')}</b><button class="icon-btn sm" data-slow="${esc(e.word)}" title="${t('Nghe chậm')}" aria-label="${t('Nghe chậm')}">🔊</button></span>
            </div>
            ${I18N.meanLang() === 'en' ? '<div class="vi wi-native" data-dnative></div>' : `<div class="vi">${esc(e.vi)}</div>`}
            ${e.def ? `<div style="margin-top:.4rem" lang="en">${esc(e.def)}</div>` : ''}
            <div class="row" style="margin-top:.8rem">
              ${card ? `<span class="chip ok">✓ ${t('Đã có trong flashcard')}</span>` : `<button class="btn primary" id="quickSave">+ ${t('Lưu flashcard')}</button>`}
              <a class="btn" href="#/practice/speak?w=${encodeURIComponent(e.word)}">🎙️ ${t('Luyện phát âm')}</a>
              ${window.LK_VERBS && LK_VERBS.verbOf(e) ? `<a class="btn" href="#/verb/${encodeURIComponent(LK_VERBS.verbOf(e))}">🔤 ${t('Chia động từ')}</a>` : ''}${window.LK_USAGE_IDX && LK_USAGE_IDX.w[e.word.toLowerCase()] ? `<a class="btn" href="#/usage/${encodeURIComponent(e.word.toLowerCase())}">📘 ${t('Cách dùng')}</a>` : ''}
            </div>
          </div>
          ${vh || pic(e)}
        </div>
        ${e.ex ? `<div class="example-box" style="margin-top:1rem"><div class="small muted">${t('Ví dụ')}</div>${highlight(e.ex, e.word)} <button class="icon-btn sm" data-speak-text="${esc(e.ex)}" aria-label="${t('Nghe cả câu')}">🔊</button></div>` : ''}
        ${App.chipsHtml(e.col, '🔗', t('Hay đi với'))}${App.chipsHtml(e.syn, '≈', t('Đồng nghĩa'))}
        <div id="related"></div>
        <div id="phraseBox"></div>
        ${App.notesHtml(e.word)}
        ${(() => { // Gom theo từ loại như Oxford/Cambridge: mỗi từ loại = nghĩa Việt + định nghĩa Anh + ví dụ của chính nghĩa đó
          const VIP = { 'danh từ': 'noun', 'động từ': 'verb', 'tính từ': 'adjective', 'trạng từ': 'adverb', 'giới từ': 'preposition', 'liên từ': 'conjunction', 'đại từ': 'pronoun', 'thán từ': 'interjection', 'từ hạn định': 'determiner', 'viết tắt': 'abbreviation', 'cụm từ': 'phrase' };
          const key = p => { p = String(p || '').toLowerCase(); return VIP[p] || p; };
          const G = [], by = {}, grp = p => by[p] || (by[p] = G[G.push({ pos: p, vi: [], defs: [] }) - 1]);
          if (I18N.meanLang() === 'vi') (e.senses || []).forEach(x => { grp(key(x.pos)).vi = x.terms; });
          (e.oxford || []).forEach(m => { const g2 = grp(key(m.pos)); g2.defs = g2.defs.concat(m.defs); });
          if (!(e.oxford || []).length) (e.meanings || []).forEach(m => { const g2 = grp(key(m.pos)); g2.defs = g2.defs.concat(m.defs.slice(0, 3)); });
          const list = G.filter(x => x.vi.length || x.defs.length);
          return list.length ? `<div style="margin-top:1.2rem"><h3>📖 ${t('Nghĩa theo từ loại')}</h3>${list.map(x => `<div class="pos-block"><div class="pos-head"><span class="chip pos">${esc(I18N.lang() === 'vi' ? Object.keys(VIP).find(k => VIP[k] === x.pos) || x.pos : x.pos)}</span>${x.vi.length ? `<b class="vi">${x.vi.map(esc).join(', ')}</b>` : ''}</div>
            ${x.defs.length ? `<ol>${x.defs.slice(0, 4).map(d => `<li>${esc(d.def)}${d.ex ? `<div class="ex small">“${highlight(d.ex, e.word)}” <button class="ctx-say" data-saysent="${esc(d.ex)}" title="${t('Nghe cả câu')}">🔊</button></div>` : ''}</li>`).join('')}</ol>` : ''}</div>`).join('')}
            <div class="tiny muted">${t('Nguồn: Oxford Languages (qua Google), Wiktionary')}</div></div>` : '';
        })()}
        ${e.meanings.length && (e.oxford || []).length ? `<details style="margin-top:.8rem"><summary class="small"><b>${t('Định nghĩa bổ sung')}</b> <span class="muted">(Wiktionary)</span></summary>${e.meanings.map(m => `
          <div class="meaning"><span class="chip pos">${esc(t(m.pos))}</span>
            <ol>${m.defs.map(d => `<li>${esc(d.def)}${d.ex ? `<div class="ex small">“${highlight(d.ex, e.word)}”</div>` : ''}</li>`).join('')}</ol></div>`).join('')}</details>` : ''}
      </div>

      ${(e.sentences || []).length ? `<div class="card" style="margin-top:1rem">
        <h3>💬 ${t('Câu ví dụ song ngữ')}</h3>
        ${e.sentences.map(s => `<div class="meaning"><div>${highlight(s.en, e.word)} <button class="icon-btn sm" data-speak-text="${esc(s.en)}" aria-label="${t('Nghe cả câu')}">🔊</button></div><div class="muted small">${esc(s.vi)} <span class="chip">${s.auto ? t('Oxford · dịch máy') : 'Tatoeba'}</span></div>
          <button class="btn sm ghost" data-use-sent="${esc(s.en)}">📌 ${t('Dùng làm ngữ cảnh')}</button></div>`).join('')}
      </div>` : ''}

      <div class="card" style="margin-top:1rem" id="saveCard">
        <h3>${card ? '📌 ' + t('Thêm ngữ cảnh cho từ này') : '➕ ' + t('Lưu vào flashcard kèm ngữ cảnh')}</h3>
        <label class="field"><span class="muted small" style="font-weight:500">${t('Câu bạn gặp từ này (bài đọc, phim, báo…) – ngữ cảnh giúp nhớ lâu gấp nhiều lần')}</span>
          <textarea class="input" id="ctx" placeholder="${t('Dán câu có chứa “{w}”…', { w: esc(e.word) })}"></textarea></label>
        <div id="ctxVi" class="muted small" style="margin-top:.4rem"></div>
        <div class="row" style="margin-top:.7rem">
          <button class="btn" id="trCtx">🌐 ${t('Dịch câu')}</button>
          <button class="btn primary" id="saveWord">${card ? t('Thêm ngữ cảnh') : t('Lưu vào flashcard')}</button>
          ${card ? `<span class="muted small">${t('{n} ngữ cảnh', { n: card.contexts.length })} · ${masteryDots(card.srs)}</span>` : ''}
        </div>
      </div>`;
    bindCommon();
    App.nativeFill($('#result [data-dnative]'), e.word, e.pos);
    if (!spoke && state.settings.autoSpeak) { spoke = true; speak(e.word, state.settings.accent, state.settings.accent === 'en-US' ? e.audioUS : e.audio); }
    if (final) { loadRelated(e); drawPhrases(e); if (window.Lex) Lex.phrases(e.word).then(l => { if (l && l.length && same() && $('#phraseBox')) drawPhrases(e, l); }).catch(() => {}); } // cụm từ theo mảnh (không nạp 2,3 MB gói từ)
    if (keep) { $('#ctx').value = keep; }

    let ctxVi = '';
    const trCtx = async () => {
      const text = $('#ctx').value.trim();
      if (!text) return '';
      $('#ctxVi').textContent = '⏳ ' + t('Đang dịch…');
      const ml = (I18N && I18N.meanLang && I18N.meanLang()) || 'vi';
      const userLang = (I18N && I18N.lang && I18N.lang()) || 'vi';
      const targetLang = ml === 'vi' ? 'vi' : (userLang !== 'en' ? userLang : 'vi');
      ctxVi = targetLang === 'vi' ? await Dict.translateVi(text) : await Dict.translateTo(text, targetLang);
      const flg = (I18N && I18N.flag ? I18N.flag(targetLang) : (targetLang === 'vi' ? '🇻🇳' : '🌐'));
      $('#ctxVi').textContent = ctxVi ? `${flg} ${ctxVi}` : t('Không dịch được câu này.');
      return ctxVi;
    };
    $('#trCtx').onclick = trCtx;
    $('#ctx').oninput = () => { ctxVi = ''; $('#ctxVi').textContent = ''; };
    $$('[data-use-sent]').forEach(b => b.onclick = () => {
      const s = e.sentences.find(x => x.en === b.dataset.useSent);
      $('#ctx').value = s.en; ctxVi = s.vi; $('#ctxVi').textContent = `🇻🇳 ${s.vi}`;
      $('#saveCard').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    const save = async () => {
      const text = $('#ctx').value.trim();
      if (text && !ctxVi) await trCtx();
      await addWord(e, text ? { text, vi: ctxVi, source: '', title: 'Ghi chú của bạn' } : null);
      toast(card ? t('Đã cập nhật thẻ') : t('Đã lưu “{w}” vào flashcard', { w: e.word }));
      location.hash === `#/dict/${encodeURIComponent(e.word)}` ? routes.dict(e.word) : (location.hash = `#/dict/${encodeURIComponent(e.word)}`);
    };
    $('#saveWord').onclick = save;
    const qs = $('#quickSave'); if (qs) qs.onclick = save;
    }
  });

  // Cụm từ & cấu trúc chứa từ đang tra: từ thư viện + sổ cụm từ của người học
  function drawPhrases(e, lx) {
    const el = $('#phraseBox'); if (!el) return;
    const re = UI.wordRegex(e.word), lx2 = (lx || []).filter(w => re.test(w.word));
    const lib = [...lx2, ...Object.values(INDEX).filter(w => /\s/.test(w.word) && re.test(w.word) && !lx2.some(l => l.word === w.word))].slice(0, 10);
    const mine = Object.values(state.cards).filter(c => /\s/.test(c.word) && re.test(c.word) && !lib.some(l => l.word === c.word)).slice(0, 10);
    const row = (w, own) => `<div class="phr"><b>${esc(w.word)}</b> <span class="small${I18N.learnLang() !== 'vi' && /[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(w.vi || '') ? ' tr-wait' : ''}" style="color:var(--accent-text);font-weight:700">${esc(w.vi || '')}</span>${w.ex ? `<div class="ex small">“${UI.highlight(w.ex, w.word)}”</div>` : ''}${w.note ? `<div class="tiny muted">📐 ${esc(w.note)}</div>` : ''}
      <div class="row" style="margin-top:.2rem"><button class="icon-btn sm" data-speak="${esc(w.word)}">🔊</button>${own || inDeck(w.word) ? `<span class="chip ok">✓ ${t('Đã lưu')}</span>` : `<button class="btn sm ghost" data-add-seed="${esc(w.word)}">+ ${t('Lưu cụm')}</button>`}</div></div>`;
    el.innerHTML = `<div style="margin-top:1rem"><div class="row between"><h3 style="margin:0">🧩 ${t('Cụm từ & cấu trúc với “{w}”', { w: esc(e.word) })}</h3><button class="btn sm" id="addPhr">＋ ${t('Lưu cụm / cấu trúc của bạn')}</button></div>
      ${lib.length || mine.length ? `<div class="phr-grid">${lib.map(w => row(w, false)).join('')}${mine.map(c => row(c, true)).join('')}</div>` : `<p class="small muted" style="margin:.4rem 0 0">${t('Chưa có cụm nào trong thư viện. Mẹo: <b>bôi đen một cụm trong câu ví dụ</b> phía trên rồi bấm “🧩 Lưu cụm này”.')}</p>`}</div>`;
    bindCommon();
    $('#addPhr').onclick = () => App.savePhraseDialog({ phrase: e.word + ' ', sentence: e.ex || '' });
  }

  // Từ liên quan (Datamuse): tính từ hay đi kèm, danh từ hay đi kèm, trái nghĩa, gần nghĩa
  async function loadRelated(e) {
    const w = encodeURIComponent(e.word);
    const get = async u => { try { const r = await fetch(u).then(r => r.json()); return Array.isArray(r) ? r : []; } catch (x) { return []; } };
    // Danh từ → tính từ hay đi kèm; tính từ → danh từ hay đi sau (tránh cụm vô nghĩa)
    const isNoun = /^n|danh/.test(e.pos || ''), isAdj = /^adj|tính/.test(e.pos || '');
    const STOP = new Set(['more', 'most', 'less', 'least', 'very', 'other', 'such', 'same', 'own', 'many', 'much', 'few', 'several', 'certain', 'various', 'error', 'orthogonal']);
    const [jjb0, jja, ant, ml] = await Promise.all([
      isNoun || !isAdj ? get(`https://api.datamuse.com/words?rel_jjb=${w}&max=14`) : [],
      isAdj ? get(`https://api.datamuse.com/words?rel_jja=${w}&max=10`) : [],
      get(`https://api.datamuse.com/words?rel_ant=${w}&max=6`),
      get(`https://api.datamuse.com/words?ml=${w}&max=16&md=f`),
    ]);
    const jjb = isAdj ? [] : jjb0.filter(x => !STOP.has(x.word) && x.score > 300).slice(0, 10);
    const el = $('#related'); if (!el || parseHash().arg !== e.word && parseHash().arg.toLowerCase() !== e.word) return;
    const chips = (arr, fmt) => arr.map(x => `<a class="chip" href="#/dict/${encodeURIComponent(x.word)}">${esc(fmt(x.word))}</a>`).join(' ');
    let html = '';
    if (jjb.length) html += `<div style="margin-top:.6rem"><b>🧩 ${t('Tính từ hay đi với “{w}”:', { w: esc(e.word) })}</b> ${chips(jjb, x => `${x} ${e.word}`)}</div>`;
    if (jja.length) html += `<div style="margin-top:.6rem"><b>🧩 ${t('Danh từ hay đi sau:')}</b> ${chips(jja, x => `${e.word} ${x}`)}</div>`;
    if (ant.length) html += `<div style="margin-top:.6rem"><b>↔ ${t('Trái nghĩa:')}</b> ${chips(ant, x => x)}</div>`;
    const syn = new Set(e.syn);
    const stemE = e.word.slice(0, Math.max(5, e.word.length - 4));
    const mlf = ml.filter(x => !syn.has(x.word) && !/\s/.test(x.word) && !x.word.startsWith(stemE) && !e.word.startsWith(x.word.slice(0, 6)) && +(((x.tags || []).find(t => t.startsWith('f:')) || 'f:0').slice(2)) >= 1).slice(0, 8);
    if (mlf.length) html += `<div style="margin-top:.6rem"><b>🔀 ${t('Từ gần nghĩa:')}</b> ${chips(mlf, x => x)}</div>`;
    el.innerHTML = html;
  }

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
        <select class="input" id="filterM" aria-label="${t('Mọi mức độ')}"><option value="">${t('Mọi mức độ')}</option><option value="0">${t('Chưa học')}</option><option value="1">${t('Đang học')}</option><option value="2">${t('Quen')}</option><option value="3">${t('Đã thuộc')}</option></select>
      </div>
      <div class="card" id="deckList"></div>`;
    let shownRows = list;
    const draw = () => {
      const q = $('#filterQ').value.trim().toLowerCase(), tp = $('#filterTopic').value, m = $('#filterM').value, fr = $('#filterFrom').value;
      const forgetSet = new Set(forgetting().map(c => c.word));
      const rows = list.filter(c => (!q || c.word.includes(q) || (c.vi || '').toLowerCase().includes(q)) && (!tp || (tp.startsWith('deck:') ? c.deck === tp.slice(5) : c.topic === tp)) && (m === '' || SRS.mastery(c.srs) === +m)
        && (!fr || (fr === 'forget' ? forgetSet.has(c.word) : origin(c) === fr))).sort((a, b) => fr === 'forget' ? SRS.retention(a.srs) - SRS.retention(b.srs) : b.added - a.added);
      shownRows = rows;
      $('#deckList').innerHTML = rows.length ? rows.slice(0, 400).map(c => `
        <div class="deck-row">
          <div class="em">${c.image ? `<img src="${esc(c.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : esc(c.emoji)}</div>
          <div style="min-width:0"><a href="#/dict/${encodeURIComponent(c.word)}"><b>${esc(c.word)}</b></a> <span class="ipa small">${esc(c.ipa)}</span><div class="small">${esc(App.meanOf(c))}</div></div>
          <div class="small muted hide-sm">${c.contexts[0] ? `📌 “${highlight(c.contexts[0].text.slice(0, 110), c.word)}${c.contexts[0].text.length > 110 ? '…' : ''}”` : esc((c.def || '').slice(0, 110))}</div>
          <div class="hide-sm small muted" style="text-align:right" title="${t('Đến hạn {date}', { date: new Date(c.srs.due).toLocaleDateString(I18N.lang()) })}">${masteryDots(c.srs)}${SRS.retention(c.srs) != null ? `<div class="tiny">🧠 ${Math.round(SRS.retention(c.srs) * 100)}%</div>` : ''}</div>
          <div class="row nowrap" style="gap:.3rem"><button class="icon-btn sm" data-speak="${esc(c.word)}" data-url="${esc(c.audio)}">🔊</button><button class="icon-btn sm" data-edit="${esc(c.word)}" title="${t('Sửa')}">✏️</button></div>
        </div>`).join('') + (rows.length > 400 ? `<p class="muted small center">${t('Hiển thị 400/{n} từ – dùng bộ lọc để thu hẹp.', { n: rows.length })}</p>` : '')
        : `<div class="empty"><div class="em">📒</div>${list.length ? t('Không có từ phù hợp bộ lọc.') : t('Sổ từ đang trống. Hãy thêm từ từ <a href="#/library">thư viện</a> hoặc <a href="#/dict">tra từ</a>.')}</div>`;
      bindCommon();
      $$('[data-edit]').forEach(b => b.onclick = () => editCard(b.dataset.edit, draw));
    };
    ['filterQ', 'filterTopic', 'filterM', 'filterFrom'].forEach(id => $('#' + id).addEventListener('input', draw));
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
      await Cards.save({ ...state.cards, ...data.cards });
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
  routes.stats = function () {
    const L = Game.levelOf(state.game.xp);
    const cards = Object.values(state.cards);
    const k = todayKey();
    // Heatmap 26 tuần
    const end = new Date(); end.setHours(0, 0, 0, 0);
    const start = new Date(end); start.setDate(end.getDate() - 7 * 26 + 1 - ((end.getDay() + 6) % 7 === 6 ? 0 : 0));
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const cells = [];
    const usedFreezes = Object.keys(state.game.frozen || {});
    const activity = d => (state.stats.days[d] || 0) + Math.round(((state.game.days[d] || {}).xp || 0) / 10);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = todayKey(d), v = activity(key);
      if (usedFreezes.includes(key)) {
        const title = `${key}: 🧊 ${t('Ngày đóng băng (chuỗi được bảo toàn)')}`;
        cells.push(`<i class="freeze" role="img" aria-label="${title}" title="${title}"></i>`);
      } else {
        const cls = v >= 60 ? 'l4' : v >= 30 ? 'l3' : v >= 10 ? 'l2' : v > 0 ? 'l1' : '';
        const title = `${key}: ${v > 0 ? t('{n} lượt ôn, {xp} XP', { n: state.stats.days[key] || 0, xp: (state.game.days[key] || {}).xp || 0 }) : t('Chưa học')}`;
        cells.push(`<i class="${cls}" role="img" aria-label="${title}" title="${title}"></i>`);
      }
    }
    // Ôn tập 14 ngày
    const past = Array.from({ length: 14 }, (_, i) => { const d = new Date(Date.now() - (13 - i) * DAY); return { d, n: state.stats.days[todayKey(d)] || 0 }; });
    const pmax = Math.max(1, ...past.map(x => x.n));
    // Dự báo 14 ngày tới
    const fc = Array.from({ length: 14 }, (_, i) => {
      const s = new Date(); s.setHours(0, 0, 0, 0); s.setDate(s.getDate() + i);
      const e = s.getTime() + DAY;
      const n = cards.filter(c => (c.srs.reps > 0 || c.srs.last) && (i === 0 ? c.srs.due < e : c.srs.due >= s.getTime() && c.srs.due < e)).length;
      return { d: s, n };
    });
    const fmax = Math.max(1, ...fc.map(x => x.n));
    // Phân bố mức thuộc
    const dist = [0, 0, 0, 0]; cards.forEach(c => dist[SRS.mastery(c.srs)]++);
    const tot = Math.max(1, cards.length);
    const colors = ['var(--surface-3)', 'var(--hard)', 'var(--easy)', 'var(--good)'];
    let acc = 0;
    const conic = dist.map((n, i) => { const a = acc; acc += n / tot * 100; return `${colors[i]} ${a}% ${acc}%`; }).join(',');
    const tl = state.game.total;
    const dn = [t('CN'), t('T2'), t('T3'), t('T4'), t('T5'), t('T6'), t('T7')];

    view.innerHTML = `
      <div class="page-head"><div><h1>${t('Tiến độ & huy hiệu')}</h1><p class="muted">${t('Theo dõi hành trình chinh phục IELTS của bạn')}</p></div><button type="button" class="btn sm" data-share>✨ ${t('Khoe thành tích')}</button></div>
      <div class="card hero-main" style="display:flex;gap:1.2rem;align-items:center;flex-wrap:wrap">
        <div class="avatar" style="width:72px;height:72px;font-size:1.8rem;background:rgba(255,255,255,.2)">${avatarInner()}</div>
        <div class="grow"><div class="muted">${t('Cấp độ hiện tại')}</div><h2 style="margin:0;color:#fff">${t('Cấp {n}', { n: L.level })} · ${esc(L.title)}</h2>
          <div class="progress" style="margin-top:.6rem"><i style="width:${L.into / L.need * 100}%"></i></div>
          <div class="small muted" style="margin-top:.3rem">${t('{a}/{b} XP tới cấp {n}', { a: L.into, b: L.need, n: L.level + 1 })} · ${t('Tổng {xp} XP', { xp: state.game.xp.toLocaleString(I18N.lang()) })}</div></div>
        <div style="text-align:center"><div class="big-num">🔥${streak()}${window.StreakUI ? ' ' + StreakUI.badgeHtml(state.game) : ''}</div><div class="muted small">${t('ngày liên tiếp')}</div></div>
      </div>

      <div class="grid g4 stats" style="margin-top:1rem">
        <div class="card stat"><div class="em">🃏</div><div><b>${tl.reviews.toLocaleString(I18N.lang())}</b><span class="muted small">${t('Lượt ôn')}</span></div></div>
        <div class="card stat"><div class="em">🎯</div><div><b>${tl.quizzes}</b><span class="muted small">${t('Bài luyện tập')}</span></div></div>
        <div class="card stat"><div class="em">🎙️</div><div><b>${tl.spoken}</b><span class="muted small">${t('Từ phát âm đúng')}</span></div></div>
        <div class="card stat"><div class="em">📖</div><div><b>${tl.readings}</b><span class="muted small">${t('Bài đọc')}</span></div></div>
      </div>

      <div class="card" style="margin-top:1rem">
        <div class="row between"><h3 style="margin:0">${t('Lịch học 6 tháng')}</h3><span class="row tiny muted" style="gap:.5rem"><span>${t('Ít')} <i class="heat" style="display:inline-grid;grid-template-rows:12px"><i></i></i><span style="display:inline-flex;gap:3px"><i style="width:12px;height:12px;border-radius:3px" class="l1"></i></span> ${t('Nhiều')}</span><span style="display:inline-flex;align-items:center;gap:3px"><i class="freeze" role="img" aria-label="${t('Đóng băng')}" style="width:12px;height:12px;border-radius:3px;display:inline-block"></i> 🧊 ${t('Đóng băng')}</span></span></div>
        <div class="heat" tabindex="0" style="margin-top:.8rem">${cells.join('')}</div>
      </div>

      <div class="grid g2" style="margin-top:1rem">
        <div class="card"><h3>${t('Lượt ôn 14 ngày qua')}</h3>
          <div class="bars" tabindex="0">${past.map(x => `<div title="${todayKey(x.d)}: ${x.n}"><em>${x.n || ''}</em><i class="${x.n ? '' : 'zero'}" style="height:${x.n ? Math.max(6, x.n / pmax * 100) : 3}px"></i><small>${x.d.getDate()}</small></div>`).join('')}</div></div>
        <div class="card"><h3>${t('Dự báo thẻ đến hạn')}</h3>
          <div class="bars" tabindex="0">${fc.map((x, i) => `<div title="${todayKey(x.d)}: ${x.n}"><em>${x.n || ''}</em><i class="${x.n ? '' : 'zero'}" style="height:${x.n ? Math.max(6, x.n / fmax * 100) : 3}px;background:linear-gradient(180deg,#2dd4bf,var(--accent))"></i><small>${i === 0 ? t('Nay') : dn[x.d.getDay()]}</small></div>`).join('')}</div></div>
      </div>

      <div class="card" style="margin-top:1rem;display:flex;gap:2rem;align-items:center;flex-wrap:wrap">
        <div style="width:150px;height:150px;border-radius:50%;background:conic-gradient(${cards.length ? conic : 'var(--surface-2) 0 100%'});display:grid;place-items:center">
          <div style="width:100px;height:100px;border-radius:50%;background:var(--surface);display:grid;place-items:center;text-align:center"><div><b style="font-size:1.5rem">${cards.length}</b><div class="tiny muted">${t('từ')}</div></div></div></div>
        <div class="grow"><h3>${t('Mức độ ghi nhớ')}</h3><div class="legend">
          ${[t('Chưa học'), t('Đang học (< 4 ngày)'), t('Quen (4–20 ngày)'), t('Đã thuộc (≥ 21 ngày)')].map((l, i) => `<span><i style="background:${colors[i]}"></i>${l}<b style="margin-left:auto">${dist[i]}</b></span>`).join('')}</div></div>
      </div>

      <div class="section-title"><h2>${t('Huy hiệu')}</h2><span class="muted small">${Object.keys(state.game.badges).length}/${Game.BADGES.length}</span></div>
      <div class="badge-grid">${Game.BADGES.map(b => `<div class="badge-card ${state.game.badges[b.id] ? '' : 'locked'}" title="${esc(b.desc)}"><div class="em">${UI.glyph(b.icon)}</div><b class="small">${esc(b.name)}</b><div class="tiny muted">${esc(b.desc)}</div></div>`).join('')}</div>`;
  };


  // ================= PHƯƠNG PHÁP HỌC =================
  // Trang Phương pháp: js/method.js

  // ================= CÀI ĐẶT =================
  // Trang Tiến độ nhận các khối thống kê từ trang chủ cũ: nhiệm vụ hôm nay, tuần này, thời điểm vàng, cấp độ nhớ
  const statsBase = routes.stats;
  routes.stats = function (...a) {
    statsBase.apply(this, a);
    const k = todayKey(), gd = state.game.days[k] || {}, quests = Game.questsFor(k), doneQ = state.game.questsDone[k] || [];
    const ph = view.querySelector('.page-head');
    const html = `<div class="grid g2 stats-top">
      <div class="card" id="quests"><div class="row between"><h3 style="margin:0">🏅 ${t('Nhiệm vụ hôm nay')}</h3><span class="chip">${doneQ.length}/${quests.length}</span></div>
        ${quests.map(q => { const v = Math.min(q.goal, gd[q.metric] || 0); const ok = doneQ.includes(q.id); return `<div class="quest ${ok ? 'done' : ''}"><div class="em">${UI.glyph(ok ? 'circle-check' : q.icon)}</div><div class="grow"><div class="row between small"><b>${esc(q.text)}</b><span class="muted">+${q.xp} XP</span></div><div class="progress thin xp" style="margin-top:.35rem"><i style="width:${v / q.goal * 100}%"></i></div><div class="tiny muted">${v}/${q.goal}</div></div></div>`; }).join('')}</div>
      <div class="card" id="goldenCard"></div>
      <div class="card"><div class="row between"><h3 style="margin:0">${t('Cấp độ nhớ')}</h3><a class="small" href="#/method">${t('Vì sao? →')}</a></div>${levelBars()}</div>
      <div id="weekCard"></div></div>`;
    if (ph) ph.insertAdjacentHTML('afterend', html); else view.insertAdjacentHTML('afterbegin', html);
    drawGolden($('#goldenCard')); weekSummary($('#weekCard'));
    const gt = setInterval(() => drawGolden($('#goldenCard')), 30000);
    App.cleanup = () => clearInterval(gt);
    if (/[?&]s=quests/.test(location.hash)) { const q = $('#quests'); if (q) q.scrollIntoView({ block: 'center' }); }
    if (window.StreakUI) StreakUI.checkSavedNotice(state.game);
  };

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
    ? `<div class="tabs" data-lang-pick style="display:inline-flex" translate="no">${I18N.SUPPORTED.map(l => `<button data-v="${l}" class="${I18N.lang() === l ? 'on' : ''}">${I18N.LANGS[l][1]}</button>`).join('')}</div>`
    : `<select class="input lang-select" data-lang-select aria-label="Language" translate="no">${I18N.SUPPORTED.map(l => `<option value="${l}" ${I18N.lang() === l ? 'selected' : ''}>${I18N.LANGS[l][1]}</option>`).join('')}</select>`;
  document.addEventListener('change', e => { if (e.target.matches && e.target.matches('[data-lang-select]') && e.target.value !== I18N.lang()) I18N.set(e.target.value); });
  document.addEventListener('click', e => { const b = e.target.closest('[data-lang-pick] [data-v]'); if (b && b.dataset.v !== I18N.lang()) I18N.set(b.dataset.v); });
  routes.welcome = function (step) {
    document.body.classList.add('bare');
    App.cleanup = () => document.body.classList.remove('bare');
    if (step === 'setup' || step === 'login') return setup(step === 'login'); // #/welcome/login (nút Đăng nhập của trang giới thiệu): thiết lập + ô đăng nhập nổi bật
    const feats = [
      ['📚', t('6.800+ từ IELTS, TOEIC & TOEFL'), t('NGSL, 570 từ học thuật AWL, 1.250 từ TOEIC, chủ đề IELTS, phrasal verb, collocation band 7+')],
      ['🧠', t('Flashcard FSRS như Anki'), t('Thuật toán ghi nhớ hiện đại nhất nhắc bạn ôn đúng lúc sắp quên')],
      ['📌', t('Từ gắn ngữ cảnh'), t('Lưu từ kèm câu gốc từ bài đọc, báo, YouTube… nhớ lâu gấp nhiều lần')],
      ['🎙️', t('Luyện phát âm có chấm điểm'), t('Nói vào micro, AI nhận dạng giọng và chấm điểm ngay')],
      ['⚡', t('Trò chơi & bài kiểm tra'), t('Ghép thẻ tính giờ, điền từ, nghe chép, test ước tính band')],
      ['🧩', t('Add-on Chrome'), t('Bấm đúp tra từ, bôi đen dịch câu, tra từ trong phụ đề YouTube')],
      ['📐', t('77 bài ngữ pháp trực quan'), t('Học từng bước, 1.700 câu luyện: trắc nghiệm, viết lại câu, tìm lỗi sai')],
      ['🔤', t('Thư viện phát âm 44 âm IPA'), t('Khẩu hình, cặp từ dễ nhầm, trọng âm & ngữ điệu')],
      ['🏁', t('Thi thử IELTS 4 kỹ năng & TOEIC'), t('Bấm giờ như thi thật, quy đổi band/điểm, chấm Writing & Speaking bằng AI')],
    ];
    const hero = document.getElementById('lkHero');
    const heroMatch = hero && (!hero.dataset.heroLang || hero.dataset.heroLang === I18N.lang());
    if (heroMatch) {
      const head = hero.querySelector('.w-head');
      if (head && !head.querySelector('.w-nav')) {
        head.innerHTML = `<a class="brand" href="#/welcome" style="padding:0"><img class="logo" src="icons/icon.svg" width="36" height="36" alt=""><span class="wordmark">lex<b>kite</b></span></a>
          <nav class="w-nav" aria-label="Lexkite"><button type="button" data-wjump="wFeats">${t('Tính năng')}</button><a href="#/tests">${t('Thi thử')}</a><a href="#/settings">${t('Add-on Chrome')}</a><a href="${App.blogUrl ? App.blogUrl() : '/vi/blog/'}" data-blog hidden>${t('Blog')}</a></nav>
          <span class="row w-tools">${App.langPicker()}<button type="button" class="btn ghost sm" id="loginH">${t('Đăng nhập')}</button><a class="btn primary sm" href="#/welcome/setup">${t('Bắt đầu học')}</a></span>`;
      }
      const cta = hero.querySelector('.w-cta');
      if (cta && !hero.querySelector('a[href="#/placement"]')) {
        cta.insertAdjacentHTML('afterend', `
          <a class="small w-lk" href="#/placement">🧭 ${t('Kiểm tra trình độ trước (5 phút) →')}</a>
          <a class="small w-lk" href="#/style">🎯 ${t('Phong cách tiếng Anh của bạn (1 phút) →')}</a>
          <p class="small muted" style="margin-top:.8rem">${t('Miễn phí · Dữ liệu học thuộc về bạn')}</p>`);
      }
      const demo = hero.querySelector('.w-demo');
      if (demo && !demo.querySelector('#wCard')) {
        demo.innerHTML = `
          <div class="card w-card" id="wCard" style="padding:0;overflow:hidden;box-shadow:var(--shadow-lg)">
            <div style="background:linear-gradient(135deg,#0F3D3E,#17595A 60%,#1F7A72);padding:1.6rem;color:#fff;text-align:center;position:relative"><div class="kit-cele" id="wKit" style="position:absolute;right:.6rem;top:.5rem">${window.Kit ? Kit.svg('cheer', 64) : ''}</div>
              <div style="font-size:4rem">🌿</div><div style="font-size:2rem;font-weight:800">sustainable</div>
              <div class="row center" style="opacity:.9;gap:.4rem">/səˈsteɪnəbl/ · adj · B2 <button type="button" class="icon-btn sm" id="wSay" aria-label="${t('Nghe')}: sustainable" style="background:rgba(255,255,255,.18);color:#fff"><span aria-hidden="true">🔊</span></button></div></div>
            <div style="padding:1.2rem 1.4rem">
              <button type="button" id="wFront" class="linkish muted small center" style="display:block;width:100%;background:none;border:0;cursor:pointer;font:inherit">👆 ${t('Chạm để lật')}</button>
              <div id="wBack" hidden><div class="vi">${esc(I18N.meanLang() === 'en' ? 'able to continue without harming the environment' : 'bền vững')}</div>
              <div class="example-box small" style="margin-top:.6rem">Governments must invest in <mark>sustainable</mark> energy to protect future generations.</div>
              <div class="grades" style="margin-top:1rem">${[['again', t('Quên')], ['hard', t('Khó')], ['good', t('Nhớ')], ['easy', t('Dễ')]].map(([g, l]) => `<button type="button" class="btn g-${g} sm" data-wg="${g}">${l}</button>`).join('')}</div></div>
              <div id="wDone" hidden class="center"><div class="kit-say" style="margin:.4rem 0">${t('Tuyệt vời! Đó chính là cách Lexkite giúp bạn nhớ lâu.')}</div><a class="btn primary" href="#/welcome/setup">${t('Tiếp tục học lộ trình của bạn →')}</a></div>
            </div>
          </div>
          <div class="grid g2 w-hl" style="margin-top:1rem">
            <div class="card"><b>🎬 ${t('Bắt từ trên YouTube')}</b><div class="muted small">${t('Dừng video, lưu từ kèm câu gốc và mốc thời gian.')}</div></div>
            <div class="card"><b>🌐 ${t('Tra từ trên mọi trang web')}</b><div class="muted small">${t('Bấm đúp để tra, bôi đen để dịch cả câu.')}</div></div>
          </div>`;
      }
      if (!hero.querySelector('#wFeats')) {
        hero.insertAdjacentHTML('beforeend', `
          <div class="grid g3 w-feats" id="wFeats" style="margin-top:3rem;scroll-margin-top:5rem">${feats.map(([em, ti, d]) => `<div class="card"><div style="font-size:2rem">${em}</div><h3 style="margin:.5rem 0 .3rem">${ti}</h3><div class="muted small">${d}</div></div>`).join('')}</div>
          <footer class="w-foot">
            <div><span class="brand" style="padding:0"><img class="logo" src="icons/icon.svg" width="36" height="36" alt=""><span class="wordmark">lex<b>kite</b></span></span><p class="small muted">${t('Học từ vựng & luyện thi tiếng Anh miễn phí – nhớ lâu bằng khoa học.')}</p><p class="tiny muted">${t('IELTS, TOEIC, TOEFL là nhãn hiệu của các tổ chức sở hữu. Lexkite là sản phẩm độc lập, không liên kết với các tổ chức này.')}</p></div>
            <div><b class="small">${t('Sản phẩm')}</b><a href="#/welcome/setup">${t('Ứng dụng web')}</a><a href="#/settings">${t('Add-on Chrome')}</a><a href="#/tests">${t('Thi thử')}</a><a href="${App.blogUrl ? App.blogUrl() : '/vi/blog/'}">${t('Blog học tiếng Anh')}</a></div>
            <div><b class="small">${t('Pháp lý & hỗ trợ')}</b><a href="${App.legalUrl('privacy')}">${t('Chính sách quyền riêng tư')}</a><a href="${App.legalUrl('terms')}">${t('Điều khoản sử dụng')}</a><a href="#/contact">${t('Liên hệ')}</a></div>
            <p class="tiny muted" style="grid-column:1/-1;margin:0">© ${new Date().getFullYear()} Lexkite · ${t('Lexkite™ là nhãn hiệu của {owner}.', { owner: 'MODIAN LUXURY JEWELRY LLC' })}</p>
          </footer>`);
      }
    } else {
      view.innerHTML = `
        <div style="max-width:980px;margin:0 auto">
          <header class="w-head"><a class="brand" href="#/welcome" style="padding:0"><img class="logo" src="icons/icon.svg" width="36" height="36" alt=""><span class="wordmark">lex<b>kite</b></span></a>
            <nav class="w-nav" aria-label="Lexkite"><button type="button" data-wjump="wFeats">${t('Tính năng')}</button><a href="#/tests">${t('Thi thử')}</a><a href="#/settings">${t('Add-on Chrome')}</a><a href="${App.blogUrl ? App.blogUrl() : '/vi/blog/'}" data-blog hidden>${t('Blog')}</a></nav>
            <span class="row w-tools">${App.langPicker()}<button type="button" class="btn ghost sm" id="loginH">${t('Đăng nhập')}</button><a class="btn primary sm" href="#/welcome/setup">${t('Bắt đầu học')}</a></span></header>
          <div class="grid g2" style="align-items:center;gap:2.5rem">
            <div>
              <span class="chip lv">✨ ${t('Nền tảng học từ vựng IELTS, TOEIC & tiếng Anh thực chiến')}</span>
              <h1 style="font-size:clamp(2rem,5vw,3.2rem);line-height:1.1;margin:1rem 0">${t('Từ vựng vững,')}<br><span class="grad-text">${t('band điểm bứt phá.')}</span></h1>
              <p class="muted" style="font-size:1.1rem">${t('Học 15 phút mỗi ngày với flashcard thông minh, trò chơi, bài đọc và luyện phát âm. Mọi từ đều có phiên âm chuẩn Anh–Anh, nghĩa tiếng Việt và câu ví dụ IELTS.')}</p>
              <div class="row w-cta" style="margin-top:1.5rem"><a class="btn primary lg" href="#/welcome/setup">${t('Bắt đầu miễn phí →')}</a><button class="btn lg" id="loginW">${t('Tôi đã có tài khoản')}</button></div>
              <a class="small w-lk" href="#/placement">🧭 ${t('Kiểm tra trình độ trước (5 phút) →')}</a>
          <a class="small w-lk" href="#/style">🎯 ${t('Phong cách tiếng Anh của bạn (1 phút) →')}</a>
              <p class="small muted" style="margin-top:.8rem">${t('Miễn phí · Dữ liệu học thuộc về bạn')}</p>
            </div>
            <div class="w-demo">
            <div class="card w-card" id="wCard" style="padding:0;overflow:hidden;box-shadow:var(--shadow-lg)">
              <div style="background:linear-gradient(135deg,#0F3D3E,#17595A 60%,#1F7A72);padding:1.6rem;color:#fff;text-align:center;position:relative"><div class="kit-cele" id="wKit" style="position:absolute;right:.6rem;top:.5rem">${window.Kit ? Kit.svg('cheer', 64) : ''}</div>
                <div style="font-size:4rem">🌿</div><div style="font-size:2rem;font-weight:800">sustainable</div>
                <div class="row center" style="opacity:.9;gap:.4rem">/səˈsteɪnəbl/ · adj · B2 <button type="button" class="icon-btn sm" id="wSay" aria-label="${t('Nghe')}: sustainable" style="background:rgba(255,255,255,.18);color:#fff"><span aria-hidden="true">🔊</span></button></div></div>
              <div style="padding:1.2rem 1.4rem">
                <button type="button" id="wFront" class="linkish muted small center" style="display:block;width:100%;background:none;border:0;cursor:pointer;font:inherit">👆 ${t('Chạm để lật')}</button>
                <div id="wBack" hidden><div class="vi">${esc(I18N.meanLang() === 'en' ? 'able to continue without harming the environment' : 'bền vững')}</div>
                <div class="example-box small" style="margin-top:.6rem">Governments must invest in <mark>sustainable</mark> energy to protect future generations.</div>
                <div class="grades" style="margin-top:1rem">${[['again', t('Quên')], ['hard', t('Khó')], ['good', t('Nhớ')], ['easy', t('Dễ')]].map(([g, l]) => `<button type="button" class="btn g-${g} sm" data-wg="${g}">${l}</button>`).join('')}</div></div>
                <div id="wDone" hidden class="center"><div class="kit-say" style="margin:.4rem 0">${t('Tuyệt vời! Đó chính là cách Lexkite giúp bạn nhớ lâu.')}</div><a class="btn primary" href="#/welcome/setup">${t('Tiếp tục học lộ trình của bạn →')}</a></div>
              </div>
            </div>
            <div class="grid g2 w-hl" style="margin-top:1rem">
              <div class="card"><b>🎬 ${t('Bắt từ trên YouTube')}</b><div class="muted small">${t('Dừng video, lưu từ kèm câu gốc và mốc thời gian.')}</div></div>
              <div class="card"><b>🌐 ${t('Tra từ trên mọi trang web')}</b><div class="muted small">${t('Bấm đúp để tra, bôi đen để dịch cả câu.')}</div></div>
            </div>
            </div>
          </div>
          <div class="grid g3 w-feats" id="wFeats" style="margin-top:3rem;scroll-margin-top:5rem">${feats.map(([em, ti, d]) => `<div class="card"><div style="font-size:2rem">${em}</div><h3 style="margin:.5rem 0 .3rem">${ti}</h3><div class="muted small">${d}</div></div>`).join('')}</div>
          <footer class="w-foot">
            <div><span class="brand" style="padding:0"><img class="logo" src="icons/icon.svg" width="36" height="36" alt=""><span class="wordmark">lex<b>kite</b></span></span><p class="small muted">${t('Học từ vựng & luyện thi tiếng Anh miễn phí – nhớ lâu bằng khoa học.')}</p><p class="tiny muted">${t('IELTS, TOEIC, TOEFL là nhãn hiệu của các tổ chức sở hữu. Lexkite là sản phẩm độc lập, không liên kết với các tổ chức này.')}</p></div>
            <div><b class="small">${t('Sản phẩm')}</b><a href="#/welcome/setup">${t('Ứng dụng web')}</a><a href="#/settings">${t('Add-on Chrome')}</a><a href="#/tests">${t('Thi thử')}</a><a href="${App.blogUrl ? App.blogUrl() : '/vi/blog/'}">${t('Blog học tiếng Anh')}</a></div>
            <div><b class="small">${t('Pháp lý & hỗ trợ')}</b><a href="${App.legalUrl('privacy')}">${t('Chính sách quyền riêng tư')}</a><a href="${App.legalUrl('terms')}">${t('Điều khoản sử dụng')}</a><a href="#/contact">${t('Liên hệ')}</a></div>
            <p class="tiny muted" style="grid-column:1/-1;margin:0">© ${new Date().getFullYear()} Lexkite · ${t('Lexkite™ là nhãn hiệu của {owner}.', { owner: 'MODIAN LUXURY JEWELRY LLC' })}</p>
          </footer>
        </div>`;
    }
    // Thẻ demo tương tác: chạm lật → chấm Nhớ/Dễ → chuông + pháo hoa + Kit chúc mừng → mời học tiếp
    const flip = () => { $('#wFront').hidden = true; $('#wBack').hidden = false; };
    $('#wCard').onclick = e => { if (!e.target.closest('button:not(#wFront),a')) flip(); };
    $('#wSay').onclick = e => { e.stopPropagation(); speak('sustainable', state.settings.accent); };
    $$('[data-wg]').forEach(b => b.onclick = e => { e.stopPropagation(); const g = b.dataset.wg;
      if (g === 'good' || g === 'easy') { Sfx.correct(); confetti(30); const k = $('#wKit'); if (k && window.Kit) k.innerHTML = Kit.svg('win', 72, true); }
      else Sfx.wrong();
      $('#wBack').hidden = true; $('#wDone').hidden = false; });
    const login = loginOnboard;
    for (const b of [$('#loginW'), $('#loginH')]) if (b) { if (window.Sync && Sync.can === false) b.remove(); else b.onclick = login; }
    view.querySelectorAll('[data-wjump]').forEach(b => b.onclick = () => document.getElementById(b.dataset.wjump).scrollIntoView({ behavior: 'smooth' }));
    if (App.blogLive) App.blogLive().then(on => { const a = view.querySelector('.w-nav a[data-blog]'); if (on && a) { a.hidden = false; a.href = App.blogUrl(); } });
  };

  // Thiết lập lần đầu: mục tiêu (gói học – tracks.js) → điểm mục tiêu theo kỳ thi của gói → cường độ → trình độ / kiểm tra đầu vào → vào thẳng Ngày 1
  function setup(login) {
    const TARGETS = { ielts: ['5.5', '6.0', '6.5', '7.0', '7.5', '8.0+'], ieltsgt: ['5.5', '6.0', '6.5', '7.0', '7.5', '8.0+'], toeic: ['450', '550', '650', '750', '850', '900+'], toefl: ['3.5', '4.0', '4.5', '5.0', '5.5+'], general: ['A2', 'B1', 'B2', 'C1'] };
    const DEF_T = { ielts: '7.0', ieltsgt: '6.5', toeic: '650', toefl: '4.5', general: 'B1' };
    const TOPIC_GROUPS = { ielts: ['topics', 'writing'], ieltsgt: ['topics', 'speaking'], toeic: ['toeic', 'bsl'], toefl: ['awl', 'nawl', 'topics'], general: ['core', 'topics'] };
    const pick = { exam: (App.exam && state.settings.exam) || 'ielts', target: '', pace: 20, topics: new Set(), v: {}, lv: '' };
    const paces = [[10, '🐢 ' + t('Nhẹ nhàng'), t('5 phút/ngày · 5 từ mới')], [20, '🚶 ' + t('Đều đặn'), t('10–15 phút/ngày · 10 từ mới')], [40, '🚀 ' + t('Tăng tốc'), t('25 phút/ngày · 20 từ mới')]];
    const topicsFor = ex => TOPICS.filter(x => TOPIC_GROUPS[ex].includes(x.group)).slice(0, 15);
    const setExam = async ex => {
      if (!App.loaded('pathx')) await App.need('pathx').catch(() => {});
      const TK = window.Tracks; if (TK) { if (TR_ID) pick.track = TR_ID; else pick.track = pick.track || TK.EX2T[ex] || 'ielts'; TR_ID = ''; ex = TK.pickExam(pick); }
      if (ex !== pick.exam || !pick.target) pick.target = DEF_T[ex];
      pick.exam = ex;
      if (!App.loaded('words')) await App.need('words').catch(() => {});
      if ((ex === 'toeic' || ex === 'toefl') && !App.loaded('tsl')) { await App.need('tsl').catch(() => {}); }
      const list = topicsFor(ex); pick.topics = new Set(list.slice(0, 3).map(x => x.id));
      draw();
    };
    let TR_ID = '';
    const draw = () => {
      const tLabel = pick.exam === 'toeic' ? t('Điểm TOEIC mục tiêu?') : pick.exam === 'toefl' ? t('Band TOEFL mục tiêu?') : pick.exam === 'general' ? t('Trình độ bạn muốn đạt?') : t('Band mục tiêu của bạn?');
      view.innerHTML = `<div style="max-width:760px;margin:0 auto" class="stack">
        <div class="row between"><span class="brand" style="padding:0"><img class="logo" src="icons/icon.svg" width="36" height="36" alt=""><span class="wordmark">lex<b>kite</b></span></span><a class="small" href="#/welcome">← ${t('Quay lại')}</a></div>
        ${window.Kit ? `<div class="kit-greet card" style="background:var(--primary-soft);border:0">${Kit.svg('happy', 58)}<div><div class="kit-say">${t('Chào bạn, mình là Kit! Vài câu hỏi nhanh để mình lên lộ trình riêng cho bạn nhé.')}</div></div></div>` : ''}
        ${window.Sync && Sync.gBtn && !state.user && !pick.noAcct ? `<div class="card row between" id="haveAcct"><div><b>${t('Đã có tài khoản?')}</b><div class="small muted">${t('Đăng nhập để khôi phục dữ liệu học của bạn.')}</div></div><div class="row">${Sync.gBtn('setupIn')}<button type="button" class="btn" id="noAcct">${t('Học không cần tài khoản')}</button></div></div>` : ''}
        ${window.Tracks ? Tracks.setupCards(pick) : ''}
        <div class="card"><h2>🎯 ${tLabel}</h2><div class="tabs" style="display:inline-flex;margin-top:.4rem" id="bandT">${TARGETS[pick.exam].map(b => `<button data-v="${b}" class="${pick.target === b ? 'on' : ''}">${b}</button>`).join('')}</div></div>
        <div class="card"><h2>⏱ ${t('Bạn muốn học với cường độ nào?')}</h2><div class="grid g3" style="margin-top:.6rem">${paces.map(([v, pt, d]) => `<button class="option ${pick.pace === v ? 'right' : ''}" data-pace="${v}" style="flex-direction:column;align-items:flex-start;gap:.2rem"><b>${pt}</b><span class="small muted">${d}</span></button>`).join('')}</div></div>
        <button class="btn primary lg block" id="go">${t('Bắt đầu Ngày {n}', { n: 1 })} →</button>
      </div>`;
      if (login && $('#haveAcct') && !pick.shownLogin) { pick.shownLogin = 1; const h = $('#haveAcct'); h.style.outline = '3px solid var(--primary)'; h.scrollIntoView({ block: 'center' }); const b = $('#setupIn'); if (b) b.focus(); }
      if ($('#setupIn')) { $('#setupIn').onclick = e => { e.stopPropagation(); loginOnboard(); }; $('#noAcct').onclick = () => { pick.noAcct = 1; $('#haveAcct').remove(); const f = $('.trk-opt[aria-pressed="true"], .trk-opt, #go'); if (f) f.focus(); }; /* [data-exam] cũ không còn sau khi đổi sang lộ trình → null.focus() ném lỗi */ }
      if (window.Tracks) Tracks.bindSetup(view, pick, id => { TR_ID = id; setExam(pick.exam); }, draw);
      $$('#bandT button').forEach(b => b.onclick = () => { pick.target = b.dataset.v; draw(); });
      $$('[data-pace]').forEach(b => b.onclick = () => { pick.pace = +b.dataset.pace; draw(); });
      $('#go').onclick = async () => {
        $('#go').disabled = true; $('#go').textContent = '⏳ ' + t('Đang chuẩn bị bộ thẻ…');
        Object.assign(state.settings, { exam: pick.exam, examTarget: pick.target, dailyGoal: pick.pace, dailyNew: pick.pace === 10 ? 5 : pick.pace === 20 ? 10 : 20 });
        if (/^ielts/.test(pick.exam)) state.settings.targetBand = pick.target;
        const to = window.Tracks ? await Tracks.startSetup(pick) : '#/review';
        await saveSettings();
        for (const id of pick.topics) for (const w of topicOf(id).words) if (!inDeck(w.word)) await addWord(w, null, { silent: true }); // bộ thẻ ôn ban đầu hợp mục tiêu
        await finishOnboarding(true, to); // vào thẳng Ngày 1 của gói (hoặc bài kiểm tra đầu vào)
      };
    };
    setExam(pick.exam);
  }

  // Đăng nhập ở màn chào/thiết lập → chờ tài khoản sẵn sàng (≤ 6 s) rồi vào app; dữ liệu cũ tự gộp về (sync.js pullMerge)
  async function loginOnboard() { if (!window.Sync) return finishOnboarding(); await Sync.signIn(); for (let i = 0; i < 30 && !state.user; i++) await new Promise(r => setTimeout(r, 200)); if (state.user) finishOnboarding(); }
  async function finishOnboarding(celebrate, to = '#/home') {
    state.settings.onboarded = true;
    await saveSettings();
    if (!Store.sandbox) try { localStorage.setItem('lk.onb', '1'); } catch (e) { /* bỏ qua */ } // lk.onb = gợi ý về dữ liệu THẬT (khung chào, trang giới thiệu tự vào app) – phiên ?sandbox=1 không được ghi
    document.body.classList.remove('bare');
    location.hash = to;
    if (celebrate === true) { Sfx.win(); confetti(140); toast('🎉 ' + t('Bộ thẻ đã sẵn sàng – bắt đầu bài ôn đầu tiên nhé!'), 3500); }
  }

  // Dữ liệu mẫu cho ảnh giới thiệu (?demo=1, chỉ áp dụng khi máy chưa có dữ liệu)
  async function seedDemo() {
    if (Object.keys(await Cards.all()).length) return;
    const now = Date.now();
    const cards = {};
    ['environment', 'technology', 'education', 'health', 'task2', 'phrasal'].forEach((id, ti) => (topicOf(id) || { words: [] }).words.slice(0, 14).forEach((w, i) => {
      const c = Cards.make(w); const r = (i * 7 + ti * 3) % 10;
      c.added = now - (40 - i) * DAY;
      if (r < 7) { c.srs = { ef: 2.3 + r / 20, interval: [1, 3, 6, 12, 24, 30, 45][r], reps: r + 1, lapses: r % 3 === 0 ? 1 : 0, due: now + ((r % 4) - 1) * DAY, last: now - DAY * (r % 3) }; }
      if (i === 2 && w.ex) c.contexts = [{ text: w.ex, vi: '', title: 'BBC News', at: now }];
      cards[w.word.toLowerCase()] = c;
    }));
    await Cards.save(cards);
    const days = {}, gdays = {};
    for (let i = 0; i < 120; i++) { if (i > 2 && (i * 13) % 7 === 0) continue; const k = todayKey(new Date(now - i * DAY)); days[k] = 10 + (i * 17) % 45; gdays[k] = { xp: 60 + (i * 31) % 160, reviews: days[k] }; }
    await Store.set('stats', { days, newToday: { day: todayKey(), n: 3 } });
    await Store.set('game', { xp: 6840, days: gdays, total: { reviews: 3120, newWords: 412, quizzes: 96, perfect: 21, matches: 34, spoken: 188, readings: 7, lookups: 260 }, best: { match: 21.4 }, badges: { first: 1, words50: 1, master10: 1, streak3: 1, streak7: 1, rev500: 1, perfect5: 1, speaker: 1, reader: 1, speed: 1, level5: 1 }, questsDone: {} });
    await Store.set('settings', { ...DEFAULT_SETTINGS, onboarded: true, autoSpeak: false, sfx: false });
  }

  // ---------- Sự kiện dùng chung ----------
  function bindCommon(after) {
    $$('[data-speak]').forEach(b => b.onclick = e => { e.preventDefault(); e.stopPropagation(); speak(b.dataset.speak, b.dataset.accent || state.settings.accent, b.dataset.url || ''); });
    $$('[data-speak-text]').forEach(b => b.onclick = e => { e.stopPropagation(); speak(b.dataset.speakText, state.settings.accent); });
    $$('[data-slow]').forEach(b => b.onclick = e => { e.stopPropagation(); const w = INDEX[String(b.dataset.slow).toLowerCase()] || state.cards[String(b.dataset.slow).toLowerCase()]; speak(b.dataset.slow, state.settings.accent, w && (state.settings.accent === 'en-US' ? w.audioUS || w.audio : w.audio), true); });
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
  function showInstallBtn() {
    if (Store.isExtension || isStandalone() || $('#installBtn')) return;
    if (!installEvt && !isIOS()) return;
    const b = document.createElement('button');
    b.id = 'installBtn'; b.className = 'pill'; b.style.cursor = 'pointer'; b.style.color = 'var(--primary)';
    b.innerHTML = `📲 <span class="hide-sm">${t('Cài app')}</span>`;
    b.title = t('Cài Lexkite lên màn hình chính');
    b.onclick = async () => {
      if (installEvt) { installEvt.prompt(); const r = await installEvt.userChoice; if (r.outcome === 'accepted') { b.remove(); toast('🎉 ' + t('Đã cài Lexkite!')); } installEvt = null; return; }
      modal(`<h2>📲 ${t('Cài Lexkite lên iPhone')}</h2><ol style="line-height:2;padding-left:1.2rem"><li>${t('Bấm nút <b>Chia sẻ</b> <span style="font-size:1.2rem">⎋</span> ở thanh dưới của Safari')}</li><li>${t('Chọn <b>“Thêm vào MH chính”</b> (Add to Home Screen)')}</li><li>${t('Bấm <b>Thêm</b> – biểu tượng Lexkite sẽ xuất hiện như một app')}</li></ol><button class="btn primary block" data-close>${t('Đã hiểu')}</button>`);
    };
    $('.top-stats').prepend(b);
  }
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvt = e; showInstallBtn(); setTimeout(() => App.installNudge && App.installNudge(), 25000); });
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
      n.querySelector('[data-go]').onclick = () => { n.remove(); const b = $('#installBtn'); if (b) b.click(); };
    } catch (e) { /* bỏ qua */ }
  };
  const netState = () => { document.body.classList.toggle('offline', !navigator.onLine); };
  window.addEventListener('offline', () => { netState(); toast('📴 ' + t('Mất kết nối – vẫn ôn tập được, tra từ mới cần mạng')); });
  window.addEventListener('online', () => { netState(); toast('✅ ' + t('Đã có mạng trở lại')); });

  // ---------- Khởi động ----------
  App.ready = (async function init() {
    if (/[?&]demo=1/.test(location.search)) await seedDemo();
    if (Store.sandbox) setTimeout(() => toast('🧪 ' + t('Chế độ thử nghiệm – dữ liệu tách riêng, không đồng bộ')), 800);
    try { await load(); } finally { if (!state.game) state.game = await Game.get().catch(() => null); dataReady(); }
    document.addEventListener('error', e => {
      const img = e.target;
      if (img.tagName === 'IMG' && img.parentElement && (img.parentElement.classList.contains('pic') || img.parentElement.classList.contains('em'))) img.parentElement.textContent = '📘';
    }, true);
    if (Store.isExtension && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(ch => { if (ch.cards) { state.cards = Object.assign(Object.create(null), ch.cards.newValue || {}); updateChrome(); } });
    }
    if (!Store.isExtension && !(window.VBNative && VBNative.is) && 'serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('/sw.js', { scope: '/app/' }).catch(() => {}); // app ở /app/ (trang / là trang giới thiệu tĩnh) – sw.js gốc tự chuyển bản cài cũ (phạm vi /) sang chế độ chuyển tiếp, xem web/sw.js. Đăng ký lúc này = sau lần vẽ đầu (JS khung nạp sau khung hình đầu – scripts/app-loader.mjs) nên không làm chậm màn đầu
    setTimeout(() => App.need('voice').catch(() => {}), 4000); /* giọng Kokoro cho phát âm từ ở mọi trang */
    App.offerRescue = offerRescue; applyFreeze().then(() => setTimeout(() => offerRescue().catch(() => {}), 1500)).catch(() => {});
    idle(() => App.need('remind').then(() => Remind.start()).catch(() => {})); // ⏰ nhắc học (js/remind.js, docs/REMINDERS.md)
    netState(); setTimeout(showInstallBtn, 1500);
    document.addEventListener('visibilitychange', async () => { if (!document.hidden) { state.cards = await Cards.all(); state.stats = await Stats.get(); state.game = await Game.get(); updateChrome(); } });
  })();
  // Các module khác (study.js, reading.js) đăng ký route rồi mới vẽ trang đầu tiên
  // Chỉ vẽ trang khi mọi module (study, grammar, pron, plan…) đã tải xong
  const boot = async () => {
    await Promise.all([App.ready, I18N.whenReady && I18N.whenReady()]); // từ điển ngôn ngữ nạp xong rồi mới vẽ (không lẫn tiếng Việt)
    updateChrome(); // vẽ lại thanh bên/đầu trang: lần vẽ trong load() có thể diễn ra trước khi từ điển nạp xong
    const fresh = !state.settings.onboarded && !Object.keys(state.cards).length && !state.game.xp;
    if (!Store.sandbox) try { fresh ? localStorage.removeItem('lk.onb') : localStorage.setItem('lk.onb', '1'); } catch (e) { /* bỏ qua */ } // sandbox: dữ liệu thử tách riêng → không ghi gợi ý (lk.onb sai làm trang giới thiệu chuyển vào app, bỏ khung chào → nhảy bố cục CLS 0,7 trên máy tính) // khung dựng sẵn trong index.html chỉ hiện cho người mới
    if (!fresh) document.body.classList.remove('bare');
    if (fresh && /^(#\/?(home)?)?$/.test(location.hash)) { location.hash = '#/welcome'; addEventListener('pointerdown', App.prefetchAll, { once: true }); return; }
    // Người học đã điều hướng/mở phiên học trong lúc app còn khởi động → vẽ lại lúc này sẽ làm mất phiên (từ khác, đếm lại từ 0): chỉ vẽ lại khi chưa có lượt vẽ nào hoặc trang không giữ phiên (App.routeHeld)
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
  };
  /* Thống kê ẩn danh + báo lỗi tự động (functions/api/hit.js) và thông báo đầu trang do quản trị đặt (functions/api/config.js).
   * Không cookie, không lưu IP: vid là mã ngẫu nhiên trên máy; 1 bản ghi mỗi phiên. Tắt khi ?sandbox / ?demo / trình duyệt tự động. */
  (() => {
    if (/[?&](sandbox|demo)=/.test(location.search) || navigator.webdriver) return;
    const BASE = /(^|\.)lexkite\.(com|pages\.dev)$/.test(location.hostname) ? '' : 'https://lexkite.com';
    const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    let vid, ret = 1;
    try { vid = localStorage.getItem('lk.vid'); if (!vid) { vid = rid(); ret = 0; localStorage.setItem('lk.vid', vid); } } catch (e) { vid = rid(); ret = 0; }
    const cur = () => (location.hash.match(/^#\/([a-z0-9-]+)/) || [, 'home'])[1], sid = rid(), path = cur();
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
    const send = d => { try { navigator.sendBeacon ? navigator.sendBeacon(BASE + '/api/hit', JSON.stringify(d)) : fetch(BASE + '/api/hit', { method: 'POST', body: JSON.stringify(d), keepalive: true }); } catch (e) { /* bỏ qua */ } };
    // Quy mô lớn: chỉ một tỉ lệ người dùng gửi thống kê phiên (hit_rate do quản trị đặt, ổn định theo vid) – giữ D1/Functions trong gói miễn phí
    let rate = 1; try { rate = Math.min(1, Math.max(0.01, +localStorage.getItem('lk.hr') || 1)); } catch (e) { /* bỏ qua */ }
    // lk.noTrack = máy của quản trị (admin.js tự đặt khi mở trang Quản trị) → không gửi phiên (vẫn báo lỗi JS & nhận thông báo)
    let noTrack = false; try { noTrack = localStorage.getItem('lk.noTrack') === '1'; } catch (e) { /* bỏ qua */ }
    const inSample = !noTrack && (parseInt(vid.slice(0, 6), 36) % 1000) < rate * 1000;
    let lastSent = 0, pv = { [path]: 1 }; // pv: lượt xem từng trang kể từ lần gửi trước (máy chủ cộng dồn vào pageviews_day)
    const flush = (force, hb) => { // hb: nhịp "đang online" 3 phút – máy chủ có thể chỉ ghi Analytics Engine (lượt xem dồn sang lần gửi sau)
      if (since) { dur += (Date.now() - since) / 1000; since = document.visibilityState === 'visible' ? Date.now() : 0; }
      if (!inSample || (!force && Date.now() - lastSent < 60000)) return;
      lastSent = Date.now(); const d = pv; if (!hb) pv = {};
      send({ t: 's', sid, vid, ret, path, cur: cur(), ref: document.referrer, lang: window.I18N ? I18N.lang() : '', dev, plat, dur: Math.round(dur), pages, lcp, pv: Object.keys(d).length ? d : undefined, hb });
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
