/* Lexkite v2 – khung ứng dụng: router, trạng thái, trang chủ, thư viện, từ điển, sổ từ, tiến độ, cài đặt. */
(function () {
  const { Store, SRS, Cards, Stats, Golden, DEFAULT_SETTINGS, todayKey, endOfToday, DAY } = Core;
  const { TOPICS, INDEX, GROUPS } = IELTS_DATA;
  const { $, $$, esc, highlight, toast, modal, closeModal, speak, pic, levelChip, posChip, ring, download, xpFloat } = UI;
  const view = $('#view');

  const state = { cards: {}, settings: { ...DEFAULT_SETTINGS }, stats: { days: {}, newToday: { day: '', n: 0 } }, game: null, user: null };
  const allWords = () => TOPICS.flatMap(t => t.words);
  const topicOf = id => TOPICS.find(t => t.id === id);
  const inDeck = w => !!state.cards[String(w).toLowerCase()];
  const masteryDots = s => UI.masteryDots(s, SRS);
  // Nguồn gốc của từ → các bộ từ cá nhân tự động
  const ORIGINS = {
    youtube: { emoji: '▶️', name: t('Từ YouTube & video'), desc: t('Lưu khi xem video có phụ đề') },
    web: { emoji: '🌐', name: t('Từ trang web'), desc: t('Lưu bằng add-on khi đọc báo, blog…') },
    reading: { emoji: '📖', name: t('Từ bài đọc'), desc: t('Lưu khi đọc bài trong Lexkite') },
    dict: { emoji: '🔎', name: t('Từ tra từ điển'), desc: t('Từ bạn tự tra và lưu') },
    library: { emoji: '📚', name: t('Từ thư viện'), desc: t('Thêm từ các bộ từ IELTS') },
  };
  function origin(c) {
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
  const saveSettings = async () => { await Store.set('settingsAt', Date.now()); const r = await Store.set('settings', state.settings); if (window.VBNative && VBNative.scheduleReminder) VBNative.scheduleReminder(); return r; }; // app gốc: đặt lại giờ nhắc học

  // Ngày có học = có ôn thẻ hoặc có XP
  function activeDays() {
    const set = new Set(Object.keys(state.stats.days).filter(k => state.stats.days[k] > 0));
    for (const [k, v] of Object.entries(state.game.days || {})) if (v.xp > 0) set.add(k);
    Object.keys(state.game.frozen || {}).forEach(k => set.add(k)); // ngày được "đóng băng" vẫn tính vào chuỗi
    return set;
  }
  // 🧊 Đóng băng chuỗi: lỡ đúng 1 ngày (hôm qua) mà còn lượt → tự dùng, chuỗi không mất. Mỗi 7 ngày liên tiếp được +1 lượt (tối đa 2)
  async function applyFreeze() {
    const g = state.game, days = activeDays(), d = new Date(); d.setDate(d.getDate() - 1);
    const y = todayKey(d); d.setDate(d.getDate() - 1); const y2 = todayKey(d);
    if ((g.freezes || 0) > 0 && !days.has(y) && days.has(y2)) {
      state.game = await Game.mutate(gs => { gs.frozen = { ...(gs.frozen || {}), [y]: 1 }; gs.freezes = (gs.freezes || 0) - 1; const ks = Object.keys(gs.frozen).sort(); while (ks.length > 30) delete gs.frozen[ks.shift()]; });
      setTimeout(() => toast(`🧊 ${t('Hôm qua bạn lỡ học – đã tự dùng 1 lượt đóng băng, chuỗi 🔥{n} ngày vẫn được giữ!', { n: streak() })}`, 4500), 1200);
    }
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
    if (App.updateExamChip) App.updateExamChip();
    const st = streak();
    $('#streakPill').textContent = `🔥 ${st}${state.game.freezes ? ' 🧊' + state.game.freezes : ''}`;
    $('#xpPill').textContent = `⭐ ${state.game.xp.toLocaleString(I18N.lang())}`;
    const { total } = Cards.dueCount(state.cards, state.settings, state.stats);
    $$('[data-due]').forEach(b => { b.hidden = !total; b.textContent = total > 99 ? '99+' : total; });
    const L = Game.levelOf(state.game.xp);
    const name = state.user ? (state.user.displayName || state.user.email || t('Bạn')) : t('Bạn');
    $('#sideLevel').innerHTML = `<div class="lv-row">${avatarHtml()}<div class="grow"><b>${esc(name)}</b><div class="tiny muted">${t('Cấp {n}', { n: L.level })} · ${esc(L.title)}</div></div></div>
      <div class="progress xp thin" style="margin-top:.6rem"><i style="width:${L.into / L.need * 100}%"></i></div>
      <div class="tiny muted" style="margin-top:.3rem">${t('{a}/{b} XP tới cấp {n}', { a: L.into, b: L.need, n: L.level + 1 })}</div>`;
    $('#avatarBtn').innerHTML = avatarInner();
  }
  const avatarInner = () => state.user && state.user.photoURL ? `<img src="${esc(state.user.photoURL)}" alt="" referrerpolicy="no-referrer">` : esc((state.user && (state.user.displayName || state.user.email) || 'L')[0].toUpperCase());
  const avatarHtml = () => `<span class="avatar">${avatarInner()}</span>`;

  // ---------- Theme ----------
  function applyTheme() {
    const t = state.settings.theme;
    if (t === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', t);
  }
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
      if (ev.type === 'badge') { Sfx.win(); confetti(80); toast(`🏅 ${t('Huy hiệu mới: {b}', { b: ev.badge.icon + ' ' + ev.badge.name })}`, 3500); }
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
    grammar: [...['tenses', 'verbs', 'sentences', 'foundation', 'academic', 'chapters', 'book2', 'drills-a', 'drills-b', 'drills-c'].map(f => G + f + '.js'), 'js/grammar.js'],
    pron: ['js/pron/sounds.js', 'js/pron/skills.js', 'js/pron.js'],
    readings: ['js/readings.js', 'js/readings-more.js'], // 30 bài đọc – chỉ tải khi cần (trang chủ tự điền mục "Bài đọc hôm nay")
    listening: ['js/qengine.js', ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => `js/listen/test${n}.js`), 'js/listen/kvoice.js', 'js/listen/audio-index.js', 'js/listening.js'],
    writing: ['js/write/task2-more.js', 'js/write/task1-more.js', 'js/write/task1-more2.js', 'js/write/ideas.js', 'js/write.js', 'js/task1.js', 'js/models.js', 'js/write/models2.js', 'js/write/models3.js', 'js/write/models4.js', 'js/write/models5.js', 'js/write/gt-letters.js', 'js/letters.js', 'js/ideas.js'],
    mock: ['js/qengine.js', 'js/readtest/test1.js', 'js/readtest/test2.js', 'js/readtest/test3.js', 'js/readtest/test4.js', 'js/readtest/test5.js', 'js/readtest/test6.js', 'js/readtest/test7.js', 'js/readtest/test8.js', 'js/readtest/test9.js', 'js/readtest/test10.js', 'js/readtest/explain-a.js', 'js/readtest/explain-b.js', 'js/readtest/explain-c.js', 'js/readtest/explain-d.js', 'js/readtest/explain-e.js', 'js/readtest/explain-f.js', 'js/readtest/explain-g.js', 'js/readtest/gt1.js', 'js/readtest/gt2.js', 'js/readtest/explain-gt.js', 'js/mock.js', 'js/rtype.js'],
    tsl: ['js/lib/tsl-a.js', 'js/lib/tsl-b.js', 'js/lib/domain-a.js', 'js/lib/domain-b.js', 'js/lib/exam-vocab.js', 'js/lib/exam-vocab2.js', 'js/lib/exam-vocab3.js'],
    speak: ['js/listen/kvoice.js', 'js/listen/audio-index.js', 'js/speak/samples.js', 'js/speak/more2.js', 'js/speak/more3.js'],
    toefl: ['js/qengine.js', 'js/toefl/data1.js', 'js/toefl/data2.js', 'js/toefl/data3.js', 'js/toefl.js'],
    toeic: ['js/qengine.js', 'js/toeic/reading1.js', 'js/toeic/reading2.js', 'js/toeic/listening1.js', 'js/toeic/listening2.js', 'js/toeic/reading3.js', 'js/toeic/listening3.js', 'js/toeic/reading4.js', 'js/toeic/listening4.js', 'js/toeic/reading5.js', 'js/toeic/listening5.js', 'js/toeic/reading6.js', 'js/toeic/listening6.js', 'js/toeic/reading7.js', 'js/toeic/listening7.js', 'js/toeic.js'],
  };
  const ROUTE_BUNDLE = { letters: 'writing', reading: 'readings', read: 'readings', cbt: 'readings', method: 'readings', grammar: 'grammar', placement: 'grammar', pron: 'pron', listening: 'listening', listen: ['listening', 'toeic'], 'listen-test': 'listening', dictation: ['listening', 'toeic'],
    toefl: ['listening', 'toefl'], 'toefl-p': ['listening', 'toefl'],
    toeic: ['tsl', 'listening', 'toeic'], 'toeic-r': ['toeic'], 'toeic-test': ['listening', 'toeic'], library: 'tsl', topic: 'tsl', practice: 'tsl', dict: 'tsl', write: 'writing', task1: 'writing', model: 'writing', models: 'writing', phrases: 'writing', ideas: 'writing', rtype: 'mock', speaking: 'speak', mock: ['listening', 'writing', 'speak', 'mock'] };
  const bundleP = {};
  // Phần nặng (đề thi, từ vựng, ngữ pháp…) tải từ CDN jsDelivr (miễn phí, không giới hạn băng thông, gắn đúng phiên bản commit)
  // → máy chủ chính chỉ phục vụ phần lõi, chịu được lượng người dùng lớn gấp nhiều lần. CDN lỗi → tự lấy từ máy chủ chính.
  const CDN = (() => { try { if (Store.isExtension || (window.VBNative && VBNative.is)) return null; const el = document.getElementById('vb-cdn'); return el ? JSON.parse(el.textContent) : null; } catch (e) { return null; } })(); // { base: GitHub Pages, files: [file dữ liệu] }
  let cdnDown = false;
  const loadOne = src => new Promise(res => { const s = document.createElement('script'); s.src = src; s.async = false; s.onload = () => res(true); s.onerror = () => res(false); document.head.appendChild(s); });
  const loadScript = async src => {
    const viaCdn = CDN && !cdnDown && CDN.files.includes(src);
    if (viaCdn && await loadOne(CDN.base + src)) return;
    if (viaCdn) cdnDown = true; // CDN lỗi → từ giờ dùng máy chủ chính cho các file còn lại (giữ đúng thứ tự)
    await loadOne(src);
  };
  // Tải song song nhưng chạy đúng thứ tự (async=false); file thiếu được bỏ qua
  App.need = (...names) => Promise.all(names.map(n => bundleP[n] || (bundleP[n] = Promise.all(BUNDLES[n].map(loadScript)))));
  App.loaded = n => !!bundleP[n];
  // Rảnh thì tải trước các module còn lại → chuyển trang tức thì, dùng offline được
  const idle = cb => ('requestIdleCallback' in window ? requestIdleCallback(cb, { timeout: 4000 }) : setTimeout(cb, 2500));
  // Tải sẵn các phần còn lại khi máy rảnh – bỏ qua khi người dùng tiết kiệm dữ liệu, mạng chậm hoặc máy yếu (tải khi cần là đủ)
  const lean = () => { const c = navigator.connection || {}; return !!c.saveData || /(^|-)2g|3g/.test(c.effectiveType || '') || (navigator.deviceMemory && navigator.deviceMemory <= 2); };
  App.prefetchAll = () => { if (!Store.isExtension && lean()) return; idle(() => Object.keys(BUNDLES).reduce((p, n) => p.then(() => App.need(n)), Promise.resolve())); };


  // Làm mới phiên âm của thẻ lưu từ bản cũ (trước khi chọn IPA theo từ loại): chạy ngầm lúc rảnh, chậm rãi, mỗi thẻ 1 lần
  const IPA_V = 5;
  App.refreshIPA = () => refreshIPA();
  async function refreshIPA() {
    if (!navigator.onLine || !window.Dict) return;
    const map = await Cards.all(), todo = Object.values(map).filter(x => x.word && (x.ipaV || 0) < IPA_V).slice(0, 150);
    for (const card of todo) {
      if (!navigator.onLine || document.hidden) break;
      const w = card.word, lib = window.IELTS_DATA && IELTS_DATA.INDEX[w.toLowerCase()];
      let ipa = '', ipaUS = '';
      if (lib && lib.ipa) ipa = lib.ipa;
      else if (!/\s/.test(w)) {
        const d = await Dict.quick(w).catch(() => null);
        // chỉ cập nhật khi cùng từ loại (tránh đổi nhầm từ đồng tự khác âm: record n./v.)
        if (d && d.found && d.ipa && (!card.pos || !d.pos || card.pos === d.pos)) { ipa = d.ipa; ipaUS = d.ipaUS || ''; }
        await new Promise(r => setTimeout(r, 900));
      }
      await Cards.patch(w, x => { x.ipaV = IPA_V; if (ipa) { x.ipa = ipa; if (ipaUS) x.ipaUS = ipaUS; } });
    }
  }

  let routeSeq = 0;
  // Nút ✕/Quay lại trong bài luyện: trở về đúng trang người học vừa đứng (lộ trình, bộ từ, kế hoạch…), không phải lúc nào cũng về Trò chơi
  let backHash = '';
  App.backHref = () => backHash || '#/practice';
  let curHash = '';
  async function route() {
    const { name, arg, query } = parseHash();
    const STUDY = /^#\/(practice\/|review)/;
    if (STUDY.test(location.hash) && curHash && !STUDY.test(curHash)) backHash = /^#\/welcome/.test(curHash) ? '#/home' : curHash;
    else if (!STUDY.test(location.hash)) backHash = '';
    curHash = location.hash;
    const b = [].concat(ROUTE_BUNDLE[name] || []), my = ++routeSeq;
    // Khung chờ (skeleton) chỉ hiện khi tải lâu hơn 150 ms → không nháy màn hình khi tải nhanh
    let skel = null;
    if (b.some(x => !App.loaded(x))) skel = setTimeout(() => { view.innerHTML = `<div class="skel-page" aria-busy="true" aria-label="${t('Đang tải…')}"><div class="skel skel-h"></div><div class="skel skel-l"></div><div class="skel-grid">${'<div class="skel skel-card"></div>'.repeat(4)}</div></div>`; }, 150);
    if (b.length) { await App.need(...b); clearTimeout(skel); if (my !== routeSeq) return; }
    const fn = routes[name] || (name ? notFound : routes.home);
    // Đánh dấu mục đang mở: thanh dưới theo 5 mục chính, menu bên theo mục con; nhóm chứa trang hiện tại tự mở
    const [tab, item] = App.navOf ? App.navOf(name, arg) : [name, name];
    $$('#bnav a').forEach(a => a.classList.toggle('active', a.dataset.tab === tab));
    $$('#nav a[data-route]').forEach(a => a.classList.toggle('active', a.dataset.route === item));
    $$('#nav .nav-group').forEach(gp => { const on = gp.dataset.tab === tab; gp.classList.toggle('current', on); if (on) gp.open = true; });
    UI.stopSpeak(); UI.clearRecs();
    document.onkeydown = null;
    if (App.cleanup) { App.cleanup(); App.cleanup = null; }
    // Chuyển trang mượt (View Transitions – Chrome/Edge/Safari mới); máy cũ: hiệu ứng mờ dần sẵn có
    const render = async () => {
      window.scrollTo(0, 0);
      await fn(arg, query);
      // Đường dẫn "Kỹ năng › Nghe" ở đầu trang con → luôn biết mình đang ở đâu, 1 chạm quay lại trang trung tâm
      const c = my === routeSeq && App.crumb && App.crumb(name, arg), ph = c && view.querySelector('.page-head');
      if (ph && !ph.querySelector('.crumb')) ph.insertAdjacentHTML('afterbegin', c);
      if (my === routeSeq) markActivity(name, arg);
    };
    if (document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches && !document.hidden) {
      // Hiệu ứng có thể bị trình duyệt hủy (tab chạy nền, chuyển trang dồn dập) → vẫn luôn vẽ trang, không bao giờ để màn hình trắng
      let drawn = false; const once = () => { if (drawn) return; drawn = true; return render(); };
      try {
        const vt = document.startViewTransition(once);
        vt.updateCallbackDone.catch(once); vt.ready.catch(() => {}); vt.finished.catch(() => {});
        setTimeout(once, 400);
        return;
      } catch (e) { /* trình duyệt không hỗ trợ */ }
    }
    view.style.animation = 'none'; void view.offsetWidth; view.style.animation = '';
    render();
  }
  App.route = route;
  // Bài đang học dở (nghe, đọc, viết, ngữ pháp, nói, đề thi…) → khối "Tiếp tục" ở trang Hôm nay mở lại bằng 1 chạm
  const RESUME = { listen: '🎧', read: '📰', write: '✍️', task1: '📈', letters: '✉️', grammar: '📐', speaking: '🗣️', 'toefl-p': '🏛️', 'toeic-r': '💼', 'toeic-test': '💼', 'listen-test': '🎧', model: '📄', pron: '🔤', cbt: '🖥️', ideas: '💡' };
  function markActivity(name, arg) {
    if (!RESUME[name] || !arg || arg === 'mix') return;
    const h = view.querySelector('.page-head h1, h1, h2'); const title = h ? h.textContent.replace(/\s+/g, ' ').trim().slice(0, 90) : '';
    if (!title) return;
    try { localStorage.setItem('vb.lastActivity', JSON.stringify({ em: RESUME[name], title, href: location.hash, at: Date.now() })); } catch (e) { /* bỏ qua */ }
  }
  App.lastActivity = () => { try { const a = JSON.parse(localStorage.getItem('vb.lastActivity') || 'null'); return a && Date.now() - a.at < 4 * DAY ? a : null; } catch (e) { return null; } };
  function notFound() {
    view.innerHTML = `<div class="card empty-note" style="max-width:560px;margin:2rem auto;text-align:center"><div style="font-size:2.4rem">🧭</div><h1 style="margin:.3rem 0">${t('Không tìm thấy trang')}</h1><p class="muted">${t('Liên kết có thể đã cũ. Chọn một mục bên dưới để tiếp tục học.')}</p>
      <div class="row center" style="flex-wrap:wrap">${[['home', '🏠', t('Hôm nay')], ['vocab', '📚', t('Từ vựng')], ['skills', '🎯', t('Kỹ năng')], ['tests', '🏁', t('Thi thử')], ['me', '👤', t('Tôi')]].map(([r, ic, l]) => `<a class="btn sm" href="#/${r}">${ic} ${l}</a>`).join('')}</div></div>`;
  }
  // Tải trước gói của trang khi người dùng sắp bấm (rê chuột/chạm vào liên kết) → mở trang gần như tức thì
  const prefetchFor = a => { const h = a && a.getAttribute && a.getAttribute('href'); if (!h || !h.startsWith('#/')) return; const n = h.slice(2).split(/[/?]/)[0]; const b = [].concat(ROUTE_BUNDLE[n] || []); if (b.some(x => !App.loaded(x))) App.need(...b).catch(() => {}); };
  ['pointerdown', 'mouseover', 'focusin'].forEach(ev => document.addEventListener(ev, e => prefetchFor(e.target.closest && e.target.closest('a[href^="#/"]')), { passive: true }));
  // Ghi chú học từ soạn sẵn (AI tầng T0 – không cần mạng/khóa): mẹo nhớ, lỗi người Việt hay mắc, cách dùng khi thi, họ từ.
  // Chia theo chữ cái đầu (js/notes/a.json…) → chỉ tải phần cần; chỗ hiển thị là ô trống được điền khi dữ liệu về.
  const notesCache = {};
  const notesFile = w => { const c = /^[a-z]/.test(w) ? w[0] : '_'; return notesCache[c] || (notesCache[c] = fetch(`js/notes/${c}.json`).then(r => r.ok ? r.json() : {}).catch(() => { delete notesCache[c]; return {}; })); };
  App.notesHtml = word => `<div class="wn-slot" data-notes="${esc(String(word || '').toLowerCase())}"></div>`;
  const renderNotes = n => { const row = (ic, lb, v) => v ? `<div class="wn-row"><span class="wn-lb">${ic} ${lb}</span><div>${esc(v)}</div></div>` : ''; return `<div class="wn">${row('💡', t('Mẹo nhớ'), n.m)}${row('⚠️', t('Lỗi hay gặp'), n.e)}${row('🎯', t('Cách dùng khi thi'), n.u)}${row('🌳', t('Họ từ'), n.f)}</div>`; };
  const fillNotes = () => document.querySelectorAll('.wn-slot[data-notes]:not([data-done])').forEach(el => { el.dataset.done = 1; const w = el.dataset.notes; notesFile(w).then(m => { const n = Object.hasOwn(m, w) && m[w]; if (n && el.isConnected) el.innerHTML = renderNotes(n); }); });
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
    async function pass() {
      if (busy) return; busy = true;
      try {
        const nodes = [], tw = document.createTreeWalker(view, NodeFilter.SHOW_TEXT); let n;
        while ((n = tw.nextNode())) { const s = n.nodeValue.trim().replace(/\s+/g, ' '); if (s.length > 1 && VI.test(s) && (!n.parentElement.closest(SKIP) || n.parentElement.closest('.wn'))) nodes.push(n); /* ghi chú từ (.wn) luôn được dịch cho người học quốc tế */ }
        const need = [];
        const put = x => { const s = x.nodeValue.trim().replace(/\s+/g, ' '); if (!mem[s]) return false; const m = x.nodeValue.match(/^\s*/)[0], e = x.nodeValue.match(/\s*$/)[0]; x.nodeValue = m + mem[s] + e; return true; };
        nodes.forEach(x => { if (!put(x)) { const s = x.nodeValue.trim().replace(/\s+/g, ' '); if (!need.includes(s)) need.push(s); } });
        for (let i = 0; i < need.length;) { // lô ≤ 1800 ký tự
          const batch = []; let len = 0; while (i < need.length && len + need[i].length < 1800) { batch.push(need[i]); len += need[i].length + 1; i++; } if (!batch.length) batch.push(need[i++]);
          const r = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=vi&tl=${to}&dt=t&q=${encodeURIComponent(batch.join('\n'))}`).then(x => x.json()).catch(() => null);
          if (!r || !r[0]) break;
          const out = r[0].map(x => x[0]).join('').split('\n');
          batch.forEach((s, k) => { if (out[k] && out[k].trim()) mem[s] = out[k].trim(); });
        }
        if (need.length) { save(); nodes.forEach(put); }
      } finally { busy = false; }
    }
    new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(pass, 120); }).observe(view, { childList: true, subtree: true, characterData: false });
  })();
  window.addEventListener('hashchange', route);
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href^="#/"]');
    if (a && a.getAttribute('href') === location.hash) { e.preventDefault(); route(); }
  });

  // ---------- Tìm kiếm toàn cục + gợi ý ----------
  (function search() {
    const input = $('#gq'), box = $('#suggest');
    input.setAttribute('aria-label', t('Tra từ'));
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
      const local = Object.keys(INDEX).filter(k => k.startsWith(q)).slice(0, 6).map(k => ({ word: INDEX[k].word, vi: INDEX[k].vi, local: true }));
      items = local; render();
      const my = ++seq;
      timer = setTimeout(async () => {
        try {
          const r = await fetch(`https://api.datamuse.com/sug?s=${encodeURIComponent(q)}&max=8`).then(r => r.json());
          if (my !== seq) return;
          const extra = r.map(x => x.word).filter(w => /^[a-z][a-z' -]*$/.test(w) && !items.some(i => i.word === w)).slice(0, 8 - items.length).map(w => ({ word: w, vi: (INDEX[w] || {}).vi }));
          items = [...items, ...extra]; render();
        } catch (e) { /* offline */ }
      }, 180);
    });
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
  routes.home = function () {
    const k = todayKey(), now = new Date(), h = now.getHours();
    const cards = Object.values(state.cards);
    const todayReviews = state.stats.days[k] || 0;
    const greet = h < 11 ? t('Chào buổi sáng') : h < 18 ? t('Chào buổi chiều') : t('Chào buổi tối');
    const name = state.user ? (state.user.displayName || '').split(' ').pop() : '';
    const ex = App.exam ? App.exam() : 'ielts', X = (App.EXAMS || {})[ex] || { ic: '🎓', short: 'IELTS' };
    const g = state.settings.goal;
    const left = g && g.date ? Math.ceil((new Date(g.date) - now) / DAY) : null;
    const chip = g && g.target ? `<a class="goal-chip" href="#/goal">${X.ic} ${esc(X.short)} ${esc(String(g.target))}${left > 0 ? ' · ' + t('còn {n} ngày', { n: left }) : ''}</a>` : `<a class="goal-chip" href="#/goal">🚩 ${t('Đặt mục tiêu')}</a>`;
    const late = h >= 19 && !todayReviews && cards.length;
    const seed = allWords(), w = seed[Math.floor(Date.now() / DAY) % seed.length];
    const quests = Game.questsFor(k), doneQ = state.game.questsDone[k] || [];
    view.innerHTML = `
      <div class="today-head">
        ${window.Kit ? Kit.svg(late ? 'sad' : 'happy', 52) : ''}
        <div class="grow"><div class="muted small">${greet}${name ? ', ' + esc(name) : ''}</div><div class="kit-say" id="kitSay">${late ? t('Học 5 phút với mình để giữ chuỗi nhé!') : t('Đây là kế hoạch của bạn hôm nay')}</div></div>
        ${chip}
      </div>
      <section class="card today-card" id="todayPlan" aria-busy="true"><div class="skel skel-l"></div><div class="skel skel-l"></div><div class="skel skel-l"></div></section>
      ${(() => { const a = App.lastActivity(); return a ? `<a class="card hover hub-card resume" href="${esc(a.href)}"><span class="hub-ic" aria-hidden="true">${a.em}</span><span class="hub-tx"><small>${t('Tiếp tục bài đang học')}</small><b>${esc(a.title)}</b></span><span class="btn sm">${t('Mở lại')} →</span></a>` : ''; })()}
      <a class="quest-line small" href="#/stats?s=quests">🏅 ${t('Nhiệm vụ hôm nay: {a}/{b}', { a: doneQ.length, b: quests.length })} · ${quests.filter(q => !doneQ.includes(q.id)).map(q => q.icon).join(' ')} <span aria-hidden="true">›</span></a>
      <div class="card wotd wotd-sm">
        ${pic(w)}
        <div>
          <div class="tiny muted" style="font-weight:700;text-transform:uppercase;letter-spacing:.06em">${t('Từ của ngày')}</div>
          <div class="row"><a href="#/dict/${encodeURIComponent(w.word)}" style="font-size:1.3rem;font-weight:800;color:var(--text)">${esc(w.word)}</a>${posChip(w.pos)}${levelChip(w.level)}<span class="ipa small">${esc(w.ipa)}</span><button class="icon-btn sm" data-speak="${esc(w.word)}" aria-label="${t('Nghe')}">🔊</button></div>
          <div class="vi">${esc(I18N.meanLang() === 'en' && w.def ? w.def : w.vi)}</div>
          <div class="row" style="margin-top:.4rem">${inDeck(w.word) ? `<span class="chip ok">✓ ${t('Đã có trong sổ')}</span>` : `<button class="btn sm" data-add-seed="${esc(w.word)}">+ Flashcard</button>`}</div>
        </div>
      </div>
      ${window.Ads ? Ads.slot('home') : ''}
    `;
    bindCommon();
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
      el.innerHTML = `<div class="row between nowrap"><div><h2 style="margin:0">${t('Kế hoạch hôm nay')}</h2><div class="muted small">${t('{a}/{b} việc', { a: n, b: tasks.length })}${mins ? ' · ≈ ' + t('{m} phút', { m: mins }) : ''}</div></div>${ring(Math.round(n / tasks.length * 100), n + '/' + tasks.length, 'var(--primary)')}</div>
        <div class="plan">${tasks.map(x => `<a class="plan-item ${x.done ? 'done' : ''} ${x === next ? 'next' : ''}" href="${x.href}"><span class="pi-em" aria-hidden="true">${x.done ? '✅' : x.em}</span><div class="grow"><b>${esc(x.t)}</b><div class="small muted">${esc(x.sub || '')}</div></div>${x.mins && !x.done ? `<span class="pi-min">${t('{m} phút', { m: x.mins })}</span>` : ''}</a>`).join('')}</div>
        <a class="btn primary lg block" href="${next.href}" style="margin-top:.9rem">${n ? t('Tiếp tục: {step}', { step: esc(next.t) }) : t('Bắt đầu: {step}', { step: esc(next.t) })} →</a>`;
    });
  };

  // Khối thống kê cũ của trang chủ → trang Tiến độ
  function drawGolden(el) {
      if (!el) return;
      const now = Golden.dueNow(state.cards);
      const nx = Golden.next(state.cards);
      if (now) {
        el.innerHTML = `<div class="row nowrap"><div style="font-size:2.4rem">⏰</div><div class="grow"><h3 style="margin:0">${t('Đang là thời điểm vàng!')}</h3>
          <div class="muted small">${t('<b style="color:var(--again)">{n} từ</b> đang ở thời điểm sắp quên – ôn ngay để nhớ lâu nhất.', { n: now })}</div></div></div>
          <a class="btn primary block" style="margin-top:.8rem" href="#/review">${t('Ôn {n} từ ngay →', { n: now })}</a>`;
      } else if (nx) {
        const ms = nx.at - Date.now(), h = Math.floor(ms / 3600000), m = Math.ceil(ms % 3600000 / 60000);
        el.innerHTML = `<div class="row nowrap"><div style="font-size:2.4rem">⏳</div><div class="grow"><h3 style="margin:0">${t('Thời điểm vàng tiếp theo')}</h3>
          <div class="muted small">${t('Còn <b style="color:var(--primary);font-size:1.1rem">{time}</b> · {n} từ sẽ cần ôn', { time: h ? t('{h} giờ {m} phút', { h, m }) : t('{m} phút', { m }), n: nx.count })}</div></div></div>
          <p class="small muted" style="margin:.6rem 0 0">${t('Lexkite sẽ nhắc bạn đúng lúc từ sắp bị quên. Trong lúc chờ, hãy học thêm từ mới hoặc chơi Ghép thẻ.')}</p>`;
      } else {
        const fresh = Cards.dueCount(state.cards, state.settings, state.stats).newCount;
        el.innerHTML = `<div class="row nowrap"><div style="font-size:2.4rem">🌱</div><div><h3 style="margin:0">${t('Chưa có lịch ôn')}</h3><div class="muted small">${t('Học từ mới đầu tiên – Lexkite sẽ tự tính “thời điểm vàng” để nhắc bạn ôn đúng lúc sắp quên.')}</div></div></div>
          <div class="row" style="margin-top:.9rem">${fresh ? `<a class="btn primary" href="#/review">✨ ${t('Học {n} từ mới ngay', { n: fresh })}</a>` : `<a class="btn primary" href="#/library">📚 ${t('Chọn bộ từ')}</a>`}<a class="btn" href="#/method">${t('Thời điểm vàng là gì?')}</a></div>
          <div class="tiny muted" style="margin-top:.8rem">${t('Đường cong quên lãng: sau 1 ngày bạn quên ~50% từ mới học – ôn đúng lúc giúp nhớ gần như mãi mãi.')}</div>`;
      }
    }

  function weekSummary(el) {
      const D = state.game.days || {}, sum = (from, n) => { const o = { newWords: 0, reviews: 0, quizzes: 0, xp: 0, active: 0 }; for (let i = 0; i < n; i++) { const d = new Date(from); d.setDate(d.getDate() - i); const x = D[todayKey(d)]; if (x) { o.newWords += x.newWords || 0; o.reviews += x.reviews || 0; o.quizzes += x.quizzes || 0; o.xp += x.xp || 0; if (x.xp || x.reviews) o.active++; } } return o; };
      const now = new Date(), dow = (now.getDay() + 6) % 7, cur = sum(now, dow + 1), lastEnd = new Date(now); lastEnd.setDate(now.getDate() - dow - 1); const prev = sum(lastEnd, 7);
      if (!prev.xp && !cur.xp) return;
      const cell = (em, label, a, b) => { const d = a - b; return `<div class="wk-cell"><span>${em}</span><b>${a}</b><small>${label}</small>${b || a ? `<i class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '▲' : '▼'} ${Math.abs(d)}</i>` : ''}</div>`; };
      if (!el) return;
      el.innerHTML = `<div class="card" style="margin-top:1rem"><div class="row between"><b>📅 ${t('Tuần này của bạn')}</b><span class="tiny muted">${t('so với cả tuần trước')}</span></div>
        <div class="wk-grid">${cell('✨', t('Từ mới'), cur.newWords, prev.newWords)}${cell('🔁', t('Lượt ôn'), cur.reviews, prev.reviews)}${cell('🎯', t('Bài luyện'), cur.quizzes, prev.quizzes)}${cell('🔥', t('Ngày học'), cur.active, prev.active)}</div></div>`;
  }

  function levelBars() {
    const n = [0, 0, 0, 0, 0, 0];
    Object.values(state.cards).forEach(c => n[SRS.level5(c.srs)]++);
    if (!n.slice(1).some(Boolean)) return `<div class="empty" style="padding:1.2rem .5rem"><div style="font-size:2rem">📶</div><div class="small">${t('Từ của bạn sẽ đi qua <b>5 cấp độ nhớ</b>: từ “mới học” (cấp 1) đến “nhớ lâu dài” (cấp 5) sau mỗi lần ôn đúng lúc.')}</div><div class="row center" style="margin-top:.6rem;gap:.3rem">${[1, 2, 3, 4, 5].map(i => `<span class="chip">${t('Cấp {n}', { n: i })}</span>`).join('→')}</div></div>`;
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
      ['test', '📝', t('Bài kiểm tra'), t('20 câu tổng hợp, chấm điểm'), '#f3e8ff'],
      ['write', '✍️', t('Phòng viết'), t('Viết Task 2, phân tích từ vựng'), '#fff1e6'],
      ['speaking', '🗣️', t('Phòng Speaking'), t('Part 1–3, ghi âm, chấm từ vựng'), '#e0f2fe'],
    ].map(([id, em, name, desc, bg]) => `<a class="mode" href="${id === 'write' || id === 'speaking' ? '#/' + id : '#/practice/' + id}"><span class="em" style="background:${bg}">${em}</span><b>${name}</b><span class="muted small">${desc}</span></a>`);
  }
  App.modeTiles = modeTiles;

  function topicCard(tp) {
    const n = tp.words.filter(w => inDeck(w.word)).length;
    const pct = n / tp.words.length * 100;
    const lv = [...new Set(tp.words.map(w => w.level).filter(Boolean))].sort().join(' · ');
    return `<a class="card hover topic-card" href="#/topic/${tp.id}" style="color:var(--text)">
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
    view.innerHTML = `
      <div class="page-head"><div><h1>${t('Thư viện từ vựng')}</h1><p class="muted">${t('{n} từ & cụm từ trong {k} bộ – phiên âm Anh–Anh, cấp độ CEFR, collocation và câu ví dụ IELTS.', { n: total.toLocaleString(I18N.lang()), k: TOPICS.length })}</p></div>
        <input class="input" id="libQ" placeholder="${t('Lọc bộ từ…')}" style="max-width:240px"></div>
      <div class="tabs" id="libTabs">
        <button data-g="all" class="${tab === 'all' ? 'on' : ''}">${t('Tất cả')}</button>
        ${GROUPS.map(g => `<button data-g="${g.id}" class="${tab === g.id ? 'on' : ''}">${g.emoji} ${esc(g.name)}</button>`).join('')}
        <button data-g="mine" class="${tab === 'mine' ? 'on' : ''}">📌 ${t('Đang học')}</button>
      </div>
      <div id="libBody" style="margin-top:1.2rem"></div>`;
    const draw = () => {
      const q = $('#libQ').value.trim().toLowerCase();
      const g = $('#libTabs .on').dataset.g;
      const match = t => (!q || t.name.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q) || t.words.some(w => w.word.toLowerCase() === q));
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
    $$('#libTabs button').forEach(b => b.onclick = () => { $$('#libTabs button').forEach(x => x.classList.toggle('on', x === b)); history.replaceState(null, '', `#/library?g=${b.dataset.g}`); draw(); });
    $('#libQ').oninput = draw;
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

  routes.topic = function (id) {
    const tp = topicOf(id);
    if (!tp) return routes.library('', new URLSearchParams());
    const levels = [...new Set(tp.words.map(w => w.level).filter(Boolean))].sort();
    const missing = () => tp.words.filter(w => !inDeck(w.word));
    const gname = (GROUPS.find(g => g.id === tp.group) || {}).name || '';
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
        </div>
      </div>
      ${levels.length > 1 ? `<div class="tabs" id="lvTabs" style="margin-bottom:1rem;display:inline-flex"><button class="on" data-lv="">${t('Tất cả')}</button>${levels.map(l => `<button data-lv="${l}">${l}</button>`).join('')}</div>` : ''}
      <div class="card" id="wordList"></div>`;
    const header = () => {
      const m = missing().length;
      $('#tCount').textContent = t('{n} đã thêm', { n: tp.words.length - m });
      const b = $('#addAll');
      b.textContent = m ? `+ ${t('Thêm {n} từ vào flashcard', { n: m })}` : `✓ ${t('Đã thêm toàn bộ')}`;
      b.disabled = !m;
    };
    let lv = '';
    const draw = () => {
      $('#wordList').innerHTML = tp.words.filter(w => !lv || w.level === lv).map(w => `
        <div class="word-row">
          <div class="em">${esc(w.emoji || '📘')}</div>
          <div style="min-width:0">
            <div class="row"><a class="w" href="#/dict/${encodeURIComponent(w.word)}">${esc(w.word)}</a>${posChip(w.pos)}${levelChip(w.level)}
              ${w.ipa ? `<span class="ipa small">${esc(w.ipa)}</span>` : ''}<button class="icon-btn sm" data-speak="${esc(w.word)}" aria-label="${t('Phát âm')}">🔊</button></div>
            <div>${I18N.meanLang() === 'en' && w.def ? `<b class="vi" style="font-size:1rem">${esc(w.def)}</b>` : `<b class="vi" style="font-size:1rem">${esc(w.vi)}</b>${w.def ? ` <span class="muted small">— ${esc(w.def)}</span>` : ''}`}</div>
            ${w.ex ? `<div class="ex small">“${highlight(w.ex, w.word)}”</div>` : ''}
            ${w.col.length ? `<div class="small" style="margin-top:.2rem">🔗 ${w.col.map(esc).join(' · ')}</div>` : ''}
          </div>
          <div>${inDeck(w.word) ? `<span class="chip ok">✓ ${t('Đã thêm')}</span>` : `<button class="btn sm" data-add-seed="${esc(w.word)}" data-topic="${tp.id}">+ ${t('Thêm')}</button>`}</div>
        </div>`).join('');
      bindCommon(header);
    };
    header(); draw();
    $$('#lvTabs button').forEach(b => b.onclick = () => { $$('#lvTabs button').forEach(x => x.classList.toggle('on', x === b)); lv = b.dataset.lv; draw(); });
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
  routes.dict = async function (q) {
    const recent = await Store.get('recent', []);
    view.innerHTML = `
      <div class="page-head"><div><h1>${t('Từ điển Anh – Việt')}</h1><p class="muted">${t('Định nghĩa Oxford Languages · phiên âm UK/US · câu song ngữ · collocation · từ liên quan')}</p></div></div>
      <form class="search" id="searchForm" autocomplete="off">
        <input class="input" id="q" placeholder="${t('Nhập từ tiếng Anh, ví dụ: sustainable')}" value="${esc(q)}" spellcheck="false" autocapitalize="off" autocorrect="off">
        <button class="btn primary lg">${t('Tra từ')}</button>
      </form>
      ${recent.length ? `<div class="row small" style="margin-top:.7rem"><span class="muted">${t('Gần đây:')}</span>${recent.map(r => `<a class="chip" href="#/dict/${encodeURIComponent(r)}">${esc(r)}</a>`).join('')}</div>` : ''}
      <div id="result" style="margin-top:1.25rem"></div>`;
    $('#searchForm').onsubmit = e => { e.preventDefault(); const v = $('#q').value.trim(); if (v) location.hash = `#/dict/${encodeURIComponent(v)}`; };
    if (!q) {
      $('#q').focus();
      const sample = ['resilient', 'mitigate', 'phenomenon', 'detrimental', 'ubiquitous', 'paradigm'];
      $('#result').innerHTML = `<div class="card empty"><div class="em">📖</div><h3>${t('Tra bất kỳ từ tiếng Anh nào')}</h3><p>${t('Phiên âm UK/US, nghĩa tiếng Việt theo từ loại, định nghĩa Oxford Languages, câu ví dụ song ngữ, hình minh họa — rồi lưu vào flashcard kèm câu ngữ cảnh của riêng bạn.')}</p>
        <div class="row center" style="margin-top:1rem">${sample.map(s => `<a class="chip" href="#/dict/${s}">${s}</a>`).join('')}</div>
        <p class="small" style="margin-top:1rem">💡 ${t('Cài <b>add-on Chrome</b> để bấm đúp vào từ hoặc bôi đen câu trên bất kỳ trang web nào.')}</p></div>`;
      return;
    }
    $('#result').innerHTML = `<div class="card empty"><div class="em">⏳</div>${t('Đang tra “{q}”…', { q: esc(q) })}</div>`;
    // Hiện kết quả nhanh trước (nghĩa, phiên âm), rồi bổ sung âm thanh, hình, câu ví dụ
    let spoke = false;
    const same = () => Dict.normWord(parseHash().arg) === Dict.normWord(q);
    const fast = await Dict.quick(q);
    if (!same()) return;
    if (fast) paint(fast, false);
    const full = await Dict.lookup(q);
    if (!same()) return;
    if (!full || !full.found) {
      if (!fast) $('#result').innerHTML = `<div class="card empty"><div class="em">🤔</div><p>${t('Không tìm thấy “{q}”.', { q: esc(q) })}${full && full.vi ? ' ' + t('Gợi ý dịch: <b>{vi}</b>', { vi: esc(full.vi) }) : ''}</p><p class="small">${t('Kiểm tra chính tả hoặc kết nối mạng.')}</p></div>`;
      return;
    }
    Store.set('recent', [full.word, ...recent.filter(r => r !== full.word)].slice(0, 8));
    const lk = todayKey() + ':' + full.word;
    if (!lookedUp.has(lk)) { lookedUp.add(lk); reward({ lookups: 1 }); }
    paint(full, true);

    function paint(e, final) {
    const keep = $('#ctx') ? $('#ctx').value : '';
    const card = state.cards[e.word];

    $('#result').innerHTML = `
      <div class="card">
        <div class="entry-head">
          <div>
            <div class="row"><span class="entry-word">${esc(e.word)}</span>${posChip(e.pos)}${levelChip(e.level)}</div>
            <div class="pron">
              <span><b class="small">🇬🇧 UK</b> <span class="ipa">${esc(e.ipa || '—')}</span><button class="icon-btn sm" data-speak="${esc(e.word)}" data-accent="en-GB" data-url="${esc(e.audio && /-uk/.test(e.audio) ? e.audio : '')}">🔊</button></span>
              <span><b class="small">🇺🇸 US</b> <span class="ipa">${esc(e.ipaUS || '—')}</span><button class="icon-btn sm" data-speak="${esc(e.word)}" data-accent="en-US" data-url="${esc(e.audioUS || '')}">🔊</button></span>
              <span><b class="small">🐢 ${t('Chậm')}</b><button class="icon-btn sm" data-slow="${esc(e.word)}" title="${t('Nghe chậm')}">🔊</button></span>
            </div>
            ${I18N.meanLang() === 'en' ? '' : `<div class="vi">${esc(e.vi)}</div>`}
            ${e.def ? `<div style="margin-top:.4rem">${esc(e.def)}</div>` : ''}
            <div class="row" style="margin-top:.8rem">
              ${card ? `<span class="chip ok">✓ ${t('Đã có trong flashcard')}</span>` : `<button class="btn primary" id="quickSave">+ ${t('Lưu flashcard')}</button>`}
              <a class="btn" href="#/practice/speak?w=${encodeURIComponent(e.word)}">🎙️ ${t('Luyện phát âm')}</a>
            </div>
          </div>
          ${pic(e)}
        </div>
        ${e.ex ? `<div class="example-box" style="margin-top:1rem"><div class="small muted">${t('Ví dụ')}</div>${highlight(e.ex, e.word)} <button class="icon-btn sm" data-speak-text="${esc(e.ex)}">🔊</button></div>` : ''}
        ${e.col.length ? `<div style="margin-top:1rem"><b>🔗 Collocations:</b> ${e.col.map(c => `<span class="chip">${esc(c)}</span>`).join(' ')}</div>` : ''}
        ${e.syn.length ? `<div style="margin-top:.6rem"><b>≈ ${t('Đồng nghĩa:')}</b> ${e.syn.map(s => `<a class="chip" href="#/dict/${encodeURIComponent(s)}">${esc(s)}</a>`).join(' ')}</div>` : ''}
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
        ${e.sentences.map(s => `<div class="meaning"><div>${highlight(s.en, e.word)} <button class="icon-btn sm" data-speak-text="${esc(s.en)}">🔊</button></div><div class="muted small">${esc(s.vi)} <span class="chip">${s.auto ? t('Oxford · dịch máy') : 'Tatoeba'}</span></div>
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
    if (!spoke && state.settings.autoSpeak) { spoke = true; speak(e.word, state.settings.accent, state.settings.accent === 'en-US' ? e.audioUS : e.audio); }
    if (final) { loadRelated(e); drawPhrases(e); }
    if (keep) { $('#ctx').value = keep; }

    let ctxVi = '';
    const trCtx = async () => {
      const text = $('#ctx').value.trim();
      if (!text) return '';
      $('#ctxVi').textContent = '⏳ ' + t('Đang dịch…');
      ctxVi = await Dict.translateVi(text);
      $('#ctxVi').textContent = ctxVi ? `🇻🇳 ${ctxVi}` : t('Không dịch được câu này.');
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
  };

  // Cụm từ & cấu trúc chứa từ đang tra: từ thư viện + sổ cụm từ của người học
  function drawPhrases(e) {
    const el = $('#phraseBox'); if (!el) return;
    const re = UI.wordRegex(e.word);
    const lib = Object.values(INDEX).filter(w => /\s/.test(w.word) && re.test(w.word)).slice(0, 10);
    const mine = Object.values(state.cards).filter(c => /\s/.test(c.word) && re.test(c.word) && !lib.some(l => l.word === c.word)).slice(0, 10);
    const row = (w, own) => `<div class="phr"><b>${esc(w.word)}</b> <span class="small" style="color:var(--accent);font-weight:700">${esc(w.vi || '')}</span>${w.ex ? `<div class="ex small">“${UI.highlight(w.ex, w.word)}”</div>` : ''}${w.note ? `<div class="tiny muted">📐 ${esc(w.note)}</div>` : ''}
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
  routes.deck = function (arg, query) {
    const from = query && query.get('from') || '';
    const list = Object.values(state.cards);
    view.innerHTML = `
      <div class="page-head"><div><h1>${t('Sổ từ của bạn')}</h1><p class="muted">${t('{n} từ · {k} đã thuộc', { n: list.length, k: masteredCount() })}</p></div>
        <div class="row"><a class="btn sm" href="#/practice/learn?src=deck">🧠 ${t('Học')}</a><a class="btn sm" href="#/practice/test?src=deck">📝 ${t('Kiểm tra')}</a><button class="btn sm" id="exportBtn">⬇️ ${t('Xuất')}</button><label class="btn sm">⬆️ ${t('Nhập')}<input type="file" id="importFile" accept="application/json" hidden></label><button class="btn sm" id="ankiOut" title="${t('Tạo file nhập thẳng vào Anki (File → Import)')}">🃏 ${t('Xuất sang Anki')}</button><label class="btn sm" title="${t('Nhập file .txt/.tsv/.csv xuất từ Anki (Notes in Plain Text)')}">🃏 ${t('Nhập từ Anki')}<input type="file" id="ankiIn" accept=".txt,.tsv,.csv,text/plain,text/csv" hidden></label></div></div>
      <div class="grid g4" style="margin-bottom:1rem">
        <input class="input" id="filterQ" placeholder="${t('Tìm từ hoặc nghĩa…')}">
        <select class="input" id="filterTopic"><option value="">${t('Tất cả bộ từ')}</option>${TOPICS.map(t => `<option value="${t.id}">${t.emoji} ${esc(t.name)}</option>`).join('')}<option value="mine">📌 ${t('Từ tự thêm')}</option></select>
        <select class="input" id="filterFrom"><option value="">${t('Mọi nguồn')}</option>${Object.entries(ORIGINS).map(([k, o]) => `<option value="${k}" ${from === k ? 'selected' : ''}>${o.emoji} ${o.name}</option>`).join('')}<option value="forget" ${from === 'forget' ? 'selected' : ''}>⚠️ ${t('Sắp quên')}</option></select>
        <select class="input" id="filterM"><option value="">${t('Mọi mức độ')}</option><option value="0">${t('Chưa học')}</option><option value="1">${t('Đang học')}</option><option value="2">${t('Quen')}</option><option value="3">${t('Đã thuộc')}</option></select>
      </div>
      <div class="card" id="deckList"></div>`;
    const draw = () => {
      const q = $('#filterQ').value.trim().toLowerCase(), tp = $('#filterTopic').value, m = $('#filterM').value, fr = $('#filterFrom').value;
      const forgetSet = new Set(forgetting().map(c => c.word));
      const rows = list.filter(c => (!q || c.word.includes(q) || (c.vi || '').toLowerCase().includes(q)) && (!tp || c.topic === tp) && (m === '' || SRS.mastery(c.srs) === +m)
        && (!fr || (fr === 'forget' ? forgetSet.has(c.word) : origin(c) === fr))).sort((a, b) => fr === 'forget' ? SRS.retention(a.srs) - SRS.retention(b.srs) : b.added - a.added);
      $('#deckList').innerHTML = rows.length ? rows.slice(0, 400).map(c => `
        <div class="deck-row">
          <div class="em">${c.image ? `<img src="${esc(c.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : esc(c.emoji)}</div>
          <div style="min-width:0"><a href="#/dict/${encodeURIComponent(c.word)}"><b>${esc(c.word)}</b></a> <span class="ipa small">${esc(c.ipa)}</span><div class="small">${esc(I18N.meanLang() === 'en' && c.def ? c.def : c.vi)}</div></div>
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
    $('#exportBtn').onclick = exportData;
    $('#importFile').onchange = importData;
    $('#ankiOut').onclick = exportAnki;
    $('#ankiIn').onchange = importAnki;
  };

  async function exportData() {
    const blob = new Blob([JSON.stringify({ app: 'ielts-lexi', version: 2, exported: new Date().toISOString(), cards: state.cards, stats: state.stats, game: state.game, settings: state.settings }, null, 2)], { type: 'application/json' });
    download(blob, `ielts-lexi-${todayKey()}.json`);
  }
  // ---------- Liên thông Anki ----------
  // Xuất: file văn bản có header Anki (tab, HTML) – Anki → File → Import nhận ngay thành thẻ Basic, kèm tag chủ đề
  function exportAnki() {
    const clean = x => String(x || '').replace(/[\t\r\n]+/g, ' ').trim();
    const rows = Object.values(state.cards).map(c => {
      const ctx = (c.contexts || [])[0];
      const front = `<b>${esc(clean(c.word))}</b>${c.ipa ? `<br><span style="color:#888">${esc(clean(c.ipa))}</span>` : ''}`;
      const back = [c.vi && `<b>${esc(clean(c.vi))}</b>`, c.def && esc(clean(c.def)), (ctx && ctx.text) ? `<i>${esc(clean(ctx.text))}</i>` : c.ex ? `<i>${esc(clean(c.ex))}</i>` : '', ctx && ctx.vi ? esc(clean(ctx.vi)) : ''].filter(Boolean).join('<br>');
      const tags = ['lexkite', c.topic || '', c.level || ''].filter(Boolean).map(t => String(t).replace(/\s+/g, '_')).join(' ');
      return [front, back, tags].join('\t');
    });
    const head = '#separator:tab\n#html:true\n#notetype:Basic\n#tags column:3\n';
    download(new Blob([head + rows.join('\n')], { type: 'text/plain;charset=utf-8' }), `lexkite-anki-${todayKey()}.txt`);
    toast(t('Đã xuất {n} thẻ – mở Anki → File → Import → chọn file này', { n: rows.length }), 4500);
  }
  // Nhập: file "Notes in Plain Text" của Anki (tab) hoặc CSV 2 cột: mặt trước = từ, mặt sau = nghĩa
  async function importAnki(e) {
    const f = e.target.files[0]; if (!f) return;
    const strip = x => String(x || '').replace(/<br\s*\/?>/gi, ' · ').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\[sound:[^\]]*\]/g, '').replace(/^"|"$/g, '').trim();
    const lines = (await f.text()).split(/\r?\n/).filter(l => l.trim() && !l.startsWith('#')).slice(0, 5000);
    let n = 0, skip = 0;
    for (const l of lines) {
      const cols = l.includes('\t') ? l.split('\t') : l.split(/,(?=(?:[^"]*"[^"]*")*[^"]*$)/);
      const word = strip(cols[0]).split(' · ')[0].toLowerCase(), vi = strip(cols[1] || '');
      if (!word || word.length > 60 || !/[a-z]/i.test(word)) { skip++; continue; }
      if (App.inDeck(word)) { skip++; continue; }
      const lib = IELTS_DATA.INDEX[word];
      await addWord(lib ? { ...lib } : { word, vi: vi.slice(0, 200), pos: /\s/.test(word) ? 'phrase' : '', emoji: '🃏', topic: 'anki' }, null, { silent: true }); n++;
    }
    e.target.value = '';
    await load(); toast(`🃏 ${skip ? t('Đã nhập {n} thẻ từ Anki (bỏ qua {k} dòng trùng/không hợp lệ)', { n, k: skip }) : t('Đã nhập {n} thẻ từ Anki', { n })}`, 4500); route();
  }
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
    const activity = d => (state.stats.days[d] || 0) + Math.round(((state.game.days[d] || {}).xp || 0) / 10);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = todayKey(d), v = activity(key);
      cells.push(`<i class="${v >= 60 ? 'l4' : v >= 30 ? 'l3' : v >= 10 ? 'l2' : v > 0 ? 'l1' : ''}" title="${key}: ${t('{n} lượt ôn, {xp} XP', { n: state.stats.days[key] || 0, xp: (state.game.days[key] || {}).xp || 0 })}"></i>`);
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
      <div class="page-head"><div><h1>${t('Tiến độ & huy hiệu')}</h1><p class="muted">${t('Theo dõi hành trình chinh phục IELTS của bạn')}</p></div></div>
      <div class="card hero-main" style="display:flex;gap:1.2rem;align-items:center;flex-wrap:wrap">
        <div class="avatar" style="width:72px;height:72px;font-size:1.8rem;background:rgba(255,255,255,.2)">${avatarInner()}</div>
        <div class="grow"><div class="muted">${t('Cấp độ hiện tại')}</div><h2 style="margin:0;color:#fff">${t('Cấp {n}', { n: L.level })} · ${esc(L.title)}</h2>
          <div class="progress" style="margin-top:.6rem"><i style="width:${L.into / L.need * 100}%"></i></div>
          <div class="small muted" style="margin-top:.3rem">${t('{a}/{b} XP tới cấp {n}', { a: L.into, b: L.need, n: L.level + 1 })} · ${t('Tổng {xp} XP', { xp: state.game.xp.toLocaleString(I18N.lang()) })}</div></div>
        <div style="text-align:center"><div class="big-num">🔥${streak()}</div><div class="muted small">${t('ngày liên tiếp')}</div></div>
      </div>

      <div class="grid g4 stats" style="margin-top:1rem">
        <div class="card stat"><div class="em">🃏</div><div><b>${tl.reviews.toLocaleString(I18N.lang())}</b><span class="muted small">${t('Lượt ôn')}</span></div></div>
        <div class="card stat"><div class="em">🎯</div><div><b>${tl.quizzes}</b><span class="muted small">${t('Bài luyện tập')}</span></div></div>
        <div class="card stat"><div class="em">🎙️</div><div><b>${tl.spoken}</b><span class="muted small">${t('Từ phát âm đúng')}</span></div></div>
        <div class="card stat"><div class="em">📖</div><div><b>${tl.readings}</b><span class="muted small">${t('Bài đọc')}</span></div></div>
      </div>

      <div class="card" style="margin-top:1rem">
        <div class="row between"><h3 style="margin:0">${t('Lịch học 6 tháng')}</h3><span class="row tiny muted">${t('Ít')} <i class="heat" style="display:inline-grid;grid-template-rows:12px"><i></i></i><span style="display:inline-flex;gap:3px"><i style="width:12px;height:12px;border-radius:3px" class="l1"></i></span> ${t('Nhiều')}</span></div>
        <div class="heat" style="margin-top:.8rem">${cells.join('')}</div>
      </div>

      <div class="grid g2" style="margin-top:1rem">
        <div class="card"><h3>${t('Lượt ôn 14 ngày qua')}</h3>
          <div class="bars">${past.map(x => `<div title="${todayKey(x.d)}: ${x.n}"><em>${x.n || ''}</em><i class="${x.n ? '' : 'zero'}" style="height:${x.n ? Math.max(6, x.n / pmax * 100) : 3}px"></i><small>${x.d.getDate()}</small></div>`).join('')}</div></div>
        <div class="card"><h3>${t('Dự báo thẻ đến hạn')}</h3>
          <div class="bars">${fc.map((x, i) => `<div title="${todayKey(x.d)}: ${x.n}"><em>${x.n || ''}</em><i class="${x.n ? '' : 'zero'}" style="height:${x.n ? Math.max(6, x.n / fmax * 100) : 3}px;background:linear-gradient(180deg,#2dd4bf,var(--accent))"></i><small>${i === 0 ? t('Nay') : dn[x.d.getDay()]}</small></div>`).join('')}</div></div>
      </div>

      <div class="card" style="margin-top:1rem;display:flex;gap:2rem;align-items:center;flex-wrap:wrap">
        <div style="width:150px;height:150px;border-radius:50%;background:conic-gradient(${cards.length ? conic : 'var(--surface-2) 0 100%'});display:grid;place-items:center">
          <div style="width:100px;height:100px;border-radius:50%;background:var(--surface);display:grid;place-items:center;text-align:center"><div><b style="font-size:1.5rem">${cards.length}</b><div class="tiny muted">${t('từ')}</div></div></div></div>
        <div class="grow"><h3>${t('Mức độ ghi nhớ')}</h3><div class="legend">
          ${[t('Chưa học'), t('Đang học (< 4 ngày)'), t('Quen (4–20 ngày)'), t('Đã thuộc (≥ 21 ngày)')].map((l, i) => `<span><i style="background:${colors[i]}"></i>${l}<b style="margin-left:auto">${dist[i]}</b></span>`).join('')}</div></div>
      </div>

      <div class="section-title"><h2>${t('Huy hiệu')}</h2><span class="muted small">${Object.keys(state.game.badges).length}/${Game.BADGES.length}</span></div>
      <div class="badge-grid">${Game.BADGES.map(b => `<div class="badge-card ${state.game.badges[b.id] ? '' : 'locked'}" title="${esc(b.desc)}"><div class="em">${b.icon}</div><b class="small">${esc(b.name)}</b><div class="tiny muted">${esc(b.desc)}</div></div>`).join('')}</div>`;
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
        ${quests.map(q => { const v = Math.min(q.goal, gd[q.metric] || 0); const ok = doneQ.includes(q.id); return `<div class="quest ${ok ? 'done' : ''}"><div class="em">${ok ? '✅' : q.icon}</div><div class="grow"><div class="row between small"><b>${esc(q.text)}</b><span class="muted">+${q.xp} XP</span></div><div class="progress thin xp" style="margin-top:.35rem"><i style="width:${v / q.goal * 100}%"></i></div><div class="tiny muted">${v}/${q.goal}</div></div></div>`; }).join('')}</div>
      <div class="card" id="goldenCard"></div>
      <div class="card"><div class="row between"><h3 style="margin:0">${t('Cấp độ nhớ')}</h3><a class="small" href="#/method">${t('Vì sao? →')}</a></div>${levelBars()}</div>
      <div id="weekCard"></div></div>`;
    if (ph) ph.insertAdjacentHTML('afterend', html); else view.insertAdjacentHTML('afterbegin', html);
    drawGolden($('#goldenCard')); weekSummary($('#weekCard'));
    const gt = setInterval(() => drawGolden($('#goldenCard')), 30000);
    App.cleanup = () => clearInterval(gt);
    if (/[?&]s=quests/.test(location.hash)) { const q = $('#quests'); if (q) q.scrollIntoView({ block: 'center' }); }
  };

  routes.settings = function () {
    const s = state.settings;
    const perm = 'Notification' in window ? Notification.permission : 'unsupported';
    const nc = x => x.replace(/[:：]\s*$/, ''); // nhãn đứng riêng – bỏ dấu hai chấm ở cuối
    const row = (label, ctl, hint = '') => `<div class="set-row"><div class="set-l"><span>${label}</span>${hint ? `<small>${hint}</small>` : ''}</div><div class="set-c">${ctl}</div></div>`;
    const tog = (id, on, label, hint = '') => `<label class="set-row switch"><span class="set-l"><span>${label}</span>${hint ? `<small>${hint}</small>` : ''}</span><input type="checkbox" id="${id}" ${on ? 'checked' : ''}></label>`;
    const slide = (label, vid, val, input, hint = '') => `<label class="set-row col"><span class="set-top"><span>${label}</span><b id="${vid}">${val}</b></span>${input}${hint ? `<small>${hint}</small>` : ''}</label>`;
    const seg = (id, items, cur) => `<div class="tabs seg" id="${id}">${items.map(([v, l, attr]) => `<button type="button" data-v="${v}" class="${cur === v ? 'on' : ''}"${attr || ''}>${l}</button>`).join('')}</div>`;
    const sec = (id, title, body) => `<section class="set-sec" id="set-${id}"><h3 class="set-h">${title}</h3><div class="set-list">${body}</div></section>`;
    const NAV = [['account', '☁️', t('Tài khoản')], ['look', '🎨', t('Giao diện')], ['study', '🎯', t('Mục tiêu học')], ['sound', '🔊', t('Âm thanh')], ['remind', '⏰', t('Nhắc học')], ['ai', '🤖', 'AI'], ['data', '💾', t('Dữ liệu')]];
    view.innerHTML = `
      <div class="set-wrap">
      <div class="page-head"><div><h1>${t('Cài đặt')}</h1><p class="muted">${t('Tài khoản, nhắc học, mục tiêu và giao diện')}</p></div></div>
      <nav class="set-nav" aria-label="${t('Cài đặt')}">${NAV.map(([id, ic, l]) => `<button type="button" data-jump="${id}"><span aria-hidden="true">${ic}</span> ${l}</button>`).join('')}</nav>
      <section class="set-sec" id="set-account"><div class="card stack" id="syncBox"></div></section>
      ${sec('look', '🎨 ' + t('Giao diện'),
        row('🌐 ' + t('Ngôn ngữ giao diện'), App.langPicker())
        + row('📖 ' + t('Nghĩa từ hiển thị bằng'), seg('sMean', [['vi', 'Tiếng Việt', ' translate="no" lang="vi" data-keep-vi'], ['en', t('Định nghĩa tiếng Anh')]], I18N.meanLang()))
        + row(t('Chế độ màu'), seg('sTheme', [['auto', '🌓 ' + t('Tự động')], ['light', '☀️ ' + t('Sáng')], ['dark', '🌙 ' + t('Tối')]], s.theme)))}
      ${sec('study', '🎯 ' + t('Mục tiêu học'),
        slide(nc(t('Từ mới mỗi ngày:')), 'vNew', s.dailyNew, `<input type="range" min="0" max="50" id="sNew" value="${s.dailyNew}">`)
        + slide(nc(t('Mục tiêu lượt ôn mỗi ngày:')), 'vGoal', s.dailyGoal, `<input type="range" min="5" max="200" step="5" id="sGoal" value="${s.dailyGoal}">`)
        + slide(nc(t('Tối đa thẻ mỗi phiên ôn:')), 'vCap', s.sessionCap || t('Không giới hạn'), `<input type="range" min="0" max="200" step="10" id="sCap" value="${s.sessionCap}">`)
        + slide('🧠 ' + nc(t('Mục tiêu ghi nhớ (thuật toán FSRS):')), 'vRet', Math.round((s.retention || 0.9) * 100) + '%', `<input type="range" min="0.8" max="0.95" step="0.01" id="sRet" value="${s.retention || 0.9}">`, t('Khả năng còn nhớ mỗi từ khi đến lượt ôn. 90% là cân bằng tốt nhất; 95% nhớ chắc hơn nhưng số lượt ôn gần gấp đôi; 85% ít ôn hơn, hợp khi bận.')))}
      ${sec('sound', '🔊 ' + t('Âm thanh & phát âm'),
        row(t('Giọng phát âm'), `<select class="input" id="sAccent"><option value="en-GB" ${s.accent === 'en-GB' ? 'selected' : ''}>🇬🇧 ${t('Anh – Anh (khuyên dùng cho IELTS)')}</option><option value="en-US" ${s.accent === 'en-US' ? 'selected' : ''}>🇺🇸 ${t('Anh – Mỹ')}</option></select>`)
        + row(t('Giọng đọc'), `<select class="input" id="sVoice"></select>`)
        + '<div id="voiceTip" class="tip small set-tip" hidden></div>'
        + slide(nc(t('Tốc độ đọc:')), 'vRate', (s.ttsRate || 0.92).toFixed(2) + '×', `<input type="range" min="0.6" max="1.2" step="0.02" id="sRate" value="${s.ttsRate || 0.92}">`)
        + row(`<button type="button" class="btn sm" id="sTry">▶️ ${t('Nghe thử câu mẫu')}</button>`, '', t('Từ đơn ưu tiên bản ghi giọng người thật'))
        + tog('sAuto', s.autoSpeak, t('Tự phát âm khi hiện thẻ'))
        + tog('sHq', s.hqVoice !== false, t('Giọng đọc tự nhiên cho bài nghe & giám khảo (tải âm thanh từ mạng)'))
        + tog('sSfx', s.sfx, t('Hiệu ứng âm thanh')))}
      ${sec('remind', '⏰ ' + t('Nhắc học hằng ngày'),
        tog('sRem', s.reminderOn, t('Bật nhắc học'))
        + `<div id="remOpts" ${s.reminderOn ? '' : 'hidden'}>`
        + row(t('Giờ nhắc'), `<input type="time" class="input" id="sTime" value="${esc(s.reminderTime)}">`, Store.isExtension ? t('Add-on gửi thông báo vào giờ này mỗi ngày (kể cả khi chưa mở trang) và hiện số thẻ cần ôn trên biểu tượng.') : t('Trình duyệt chỉ nhắc được khi trang đang mở. Để nhắc chắc chắn, thêm lịch nhắc vào điện thoại hoặc dùng add-on Chrome.'))
        + `<div class="set-row"><div class="set-btns">${Store.isExtension ? '' : `<button type="button" class="btn sm" id="sPerm" ${perm === 'granted' || perm === 'unsupported' ? 'disabled' : ''}>${perm === 'granted' ? '✓ ' + t('Đã cho phép thông báo') : perm === 'unsupported' ? t('Không hỗ trợ thông báo') : '🔔 ' + t('Cho phép thông báo')}</button><button type="button" class="btn sm" id="sIcs">📅 ${t('Thêm vào Lịch (.ics)')}</button>`}<button type="button" class="btn sm ghost" id="sTest">${t('Thử gửi thông báo')}</button></div></div></div>`
        + tog('sGold', s.goldenOn, t('Nhắc “thời điểm vàng”'), t('Báo khi có từ sắp bị quên'))
        + `<div id="goldOpts" ${s.goldenOn ? '' : 'hidden'}>`
        + `<label class="set-row col"><span class="set-top"><span>${t('Chỉ nhắc khi có ít nhất <b id="vGMin">{n}</b> từ cần ôn', { n: s.goldenMin })}</span></span><input type="range" min="1" max="50" id="sGMin" value="${s.goldenMin}"></label>`
        + row(t('Giờ yên lặng từ'), `<span class="set-btns"><input type="time" class="input" id="sQ1" value="${esc(s.quietStart)}"><span class="muted">${t('đến')}</span><input type="time" class="input" id="sQ2" value="${esc(s.quietEnd)}"></span>`)
        + '</div>')}
      <section class="set-sec" id="set-ai"><div id="aiBox"></div></section>
      ${Store.isExtension ? '' : sec('ext', '🧩 ' + t('Add-on từ điển cho Chrome'), `<div class="set-row"><div class="set-l"><span class="small">${t('Bấm đúp vào bất kỳ từ tiếng Anh nào trên web để xem phiên âm, nghĩa, hình ảnh và <b>lưu vào flashcard kèm câu gốc làm ngữ cảnh</b>. Bôi đen cả câu/đoạn để <b>dịch sang tiếng Việt</b>.')}</span><small>${t('Cài đặt: mở <code>chrome://extensions</code> → bật <i>Developer mode</i> → <i>Load unpacked</i> → chọn thư mục <code>extension</code>.')}</small></div></div>`)}
      ${sec('data', '💾 ' + t('Dữ liệu'),
        row(t('Xuất sao lưu'), `<button type="button" class="btn sm" id="sExport">⬇️ ${t('Xuất sao lưu')}</button>`)
        + row(t('Nhập sao lưu'), `<label class="btn sm">⬆️ ${t('Nhập sao lưu')}<input type="file" id="sImport" accept="application/json" hidden></label>`)
        + row(`<span class="danger-t">${t('Xóa toàn bộ dữ liệu học')}</span>`, `<button type="button" class="btn sm danger" id="sReset">${t('Xóa')}</button>`))}
      </div>`;
    $$('.set-nav [data-jump]').forEach(b => b.onclick = () => { const el = document.getElementById('set-' + b.dataset.jump); if (el) el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); });

    const save = async () => { await saveSettings(); Core.sfxOff = !s.sfx; updateChrome(); if (window.Sync) Sync.schedule(); };
    $('#sRem').onchange = e => { s.reminderOn = e.target.checked; $('#remOpts').hidden = !s.reminderOn; save(); };
    $('#sTime').onchange = e => { s.reminderTime = e.target.value || '20:00'; save(); toast(t('Sẽ nhắc lúc {time} mỗi ngày', { time: s.reminderTime })); };
    $('#sNew').oninput = e => { s.dailyNew = +e.target.value; $('#vNew').textContent = s.dailyNew; save(); };
    $('#sGoal').oninput = e => { s.dailyGoal = +e.target.value; $('#vGoal').textContent = s.dailyGoal; save(); };
    const drawAI = async () => { const b = $('#aiBox'); if (!b || !window.AI) return; b.innerHTML = await AI.settingsHtml(); AI.bindSettings(drawAI); };
    drawAI();
    $('#sRet').oninput = e => { s.retention = +e.target.value; SRS.retentionTarget = s.retention; $('#vRet').textContent = Math.round(s.retention * 100) + '%'; save(); };
    $('#sGold').onchange = e => { s.goldenOn = e.target.checked; $('#goldOpts').hidden = !s.goldenOn; save(); };
    $('#sGMin').oninput = e => { s.goldenMin = +e.target.value; $('#vGMin').textContent = s.goldenMin; save(); };
    $('#sQ1').onchange = e => { s.quietStart = e.target.value || '22:30'; save(); };
    $('#sQ2').onchange = e => { s.quietEnd = e.target.value || '07:00'; save(); };
    $('#sCap').oninput = e => { s.sessionCap = +e.target.value; $('#vCap').textContent = s.sessionCap || t('Không giới hạn'); save(); };
    const fillVoices = () => {
      if (!$('#sVoice')) return; // đã rời trang Cài đặt
      const list = UI.voicesFor(s.accent);
      const cur = (UI.pickVoice(s.accent) || {}).name;
      $('#sVoice').innerHTML = list.length ? list.map((v, i) => `<option value="${esc(v.name)}" ${v.name === cur ? 'selected' : ''}>${esc(v.name)}${i === 0 ? ' ⭐ ' + t('khuyên dùng') : ''}</option>`).join('') : `<option>${t('Trình duyệt chưa có giọng tiếng Anh')}</option>`;
    };
    // Gợi ý giọng đọc hay hơn (miễn phí) khi máy chỉ có giọng "robot" – theo đúng hệ điều hành/trình duyệt
    const voiceTip = () => { const el = $('#voiceTip'); if (!el) return; const h = App.voiceTipHtml(s.accent); el.hidden = !h; el.innerHTML = h; };
    fillVoices(); voiceTip(); setTimeout(() => { fillVoices(); voiceTip(); }, 600);
    $('#sVoice').onchange = e => { s.voice = { ...(s.voice || {}), [s.accent]: e.target.value }; save(); UI.tts('This is how I will read words and sentences to you.', s.accent); };
    $('#sRate').oninput = e => { s.ttsRate = +e.target.value; $('#vRate').textContent = s.ttsRate.toFixed(2) + '×'; save(); };
    $('#sTry').onclick = () => UI.tts('Many people believe that renewable energy is the key to a sustainable future. However, the transition will not happen overnight.', s.accent);
    $('#sAccent').onchange = e => { s.accent = e.target.value; save(); fillVoices(); speak('pronunciation', s.accent); };
    $('#sAuto').onchange = e => { s.autoSpeak = e.target.checked; save(); };
    $('#sHq').onchange = e => { s.hqVoice = e.target.checked; save(); };
    $('#sSfx').onchange = e => { s.sfx = e.target.checked; save(); if (s.sfx) { Core.sfxOff = false; Sfx.correct(); } };
    $$('#sTheme button').forEach(b => b.onclick = () => { s.theme = b.dataset.v; applyTheme(); save(); $$('#sTheme button').forEach(x => x.classList.toggle('on', x === b)); });
    $('#sTest').onclick = () => notify(true);
    $$('#sMean [data-v]').forEach(b => b.onclick = () => { if (b.dataset.v !== I18N.meanLang()) I18N.setMean(b.dataset.v); });
    const p = $('#sPerm'); if (p) p.onclick = async () => { await Notification.requestPermission(); routes.settings(); };
    const ics = $('#sIcs'); if (ics) ics.onclick = () => download(new Blob([makeICS(s.reminderTime)], { type: 'text/calendar' }), 'ielts-lexi-nhac-hoc.ics');
    $('#sExport').onclick = exportData;
    $('#sImport').onchange = importData;
    $('#sReset').onclick = async () => {
      if (!confirm(t('Xóa toàn bộ flashcard, tiến độ, XP và thống kê trên thiết bị này? Không thể hoàn tác.'))) return;
      await Store.set('cards', {}); await Store.set('stats', { days: {}, newToday: { day: '', n: 0 } }); await Store.set('game', null);
      await load(); toast(t('Đã xóa dữ liệu')); routes.settings();
    };
    if (window.Sync) Sync.renderBox($('#syncBox')); else $('#syncBox').hidden = true;
  };

  function makeICS(time) {
    const [hh, mm] = time.split(':');
    const ymd = todayKey().replace(/-/g, '');
    const url = location.href.split('#')[0];
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Lexkite//VI', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT', `UID:ielts-lexi-daily-${ymd}@lexi`, `DTSTAMP:${ymd}T000000Z`, `DTSTART:${ymd}T${hh}${mm}00`, 'DURATION:PT15M', 'RRULE:FREQ=DAILY',
      'SUMMARY:📚 ' + t('Ôn từ vựng IELTS (15 phút)'), 'DESCRIPTION:' + t('Mở Lexkite để ôn flashcard hôm nay: {url}', { url }), `URL:${url}`,
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + t('Đến giờ ôn từ vựng IELTS!'), 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }

  async function notify(force) {
    const { total } = Cards.dueCount(state.cards, state.settings, state.stats);
    const title = t('Lexkite – đến giờ học rồi!') + ' 📚';
    const body = total ? t('Bạn có {n} thẻ cần ôn hôm nay. Giữ chuỗi 🔥{s} ngày nhé!', { n: total, s: streak() }) : t('Học vài từ mới để giữ chuỗi ngày học nhé') + ' 🔥';
    if (Store.isExtension && chrome.runtime) { chrome.runtime.sendMessage({ type: 'testNotify' }); return; }
    if (!('Notification' in window)) return force && toast(t('Trình duyệt không hỗ trợ thông báo'));
    if (Notification.permission !== 'granted') {
      if (!force) return;
      if (await Notification.requestPermission() !== 'granted') return toast(t('Bạn chưa cho phép thông báo'));
    }
    const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
    if (reg) reg.showNotification(title, { body, icon: 'icons/icon-192.png', tag: 'daily', data: { url: location.href.split('#')[0] + '#/review' } });
    else new Notification(title, { body, icon: 'icons/icon-192.png' });
  }

  // Ghi thông tin nhắc học cho service worker (nhắc cả khi app đóng – Periodic Background Sync, Chrome app đã cài)
  let metaKey = '';
  async function syncMeta(s) {
    if (!('caches' in window) || !navigator.serviceWorker) return;
    const { total } = Cards.dueCount(state.cards, state.settings, state.stats);
    const today = new Date().toISOString().slice(0, 10), studied = (state.stats.days || {})[todayKey()] > 0;
    const m = { on: s.reminderOn !== false, time: s.reminderTime || '20:00', last: studied ? today : '', title: t('Lexkite – đến giờ học rồi!') + ' 📚',
      body: total ? t('Bạn có {n} thẻ cần ôn hôm nay. Giữ chuỗi 🔥{s} ngày nhé!', { n: total, s: streak() }) : t('Học vài từ mới để giữ chuỗi ngày học nhé') };
    const k = JSON.stringify(m); if (k === metaKey) return; metaKey = k;
    await (await caches.open('vb-meta')).put('/__meta', new Response(k, { headers: { 'Content-Type': 'application/json' } }));
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg && reg.periodicSync && m.on && 'Notification' in window && Notification.permission === 'granted') {
      try { const st = await navigator.permissions.query({ name: 'periodic-background-sync' }); if (st.state === 'granted') await reg.periodicSync.register('vb-daily', { minInterval: 3 * 3600e3 }); } catch (e) { /* không hỗ trợ */ }
    }
  }
  async function checkReminder() {
    const s = state.settings;
    if (Store.isExtension) return;
    syncMeta(s).catch(() => {});
    // Thời điểm vàng
    if (s.goldenOn && !Golden.quiet(s) && 'Notification' in window && Notification.permission === 'granted') {
      const n = Golden.dueNow(state.cards);
      const last = await Store.get('lastGolden', 0);
      if (n >= s.goldenMin && Date.now() - last > 3 * 3600 * 1000 && document.hidden) {
        await Store.set('lastGolden', Date.now());
        const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
        const opt = { body: t('{n} từ đang ở thời điểm sắp quên – ôn 3 phút để nhớ lâu hơn!', { n }), icon: 'icons/icon-192.png', tag: 'golden', data: { url: location.href.split('#')[0] + '#/review' } };
        const gt = '⏰ ' + t('Thời điểm vàng!');
        reg ? reg.showNotification(gt, opt) : new Notification(gt, opt);
      }
    }
    if (!s.reminderOn) return;
    const [hh, mm] = s.reminderTime.split(':').map(Number);
    const now = new Date();
    if (now.getHours() * 60 + now.getMinutes() < hh * 60 + mm) return;
    if (await Store.get('lastNotified', '') === todayKey()) return;
    if ((state.stats.days[todayKey()] || 0) >= s.dailyGoal) return;
    await Store.set('lastNotified', todayKey());
    notify(false);
  }


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
    if (step === 'setup') return setup();
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
    view.innerHTML = `
      <div style="max-width:980px;margin:0 auto">
        <div class="row between" style="margin-bottom:2rem"><span class="brand" style="padding:0"><img class="logo" src="icons/icon.svg" alt=""><span class="wordmark">lex<b>kite</b></span></span>
          <span class="row w-tools" style="gap:.5rem">${App.langPicker()}<button class="btn ghost sm" id="skipW">${t('Đã có dữ liệu? Vào app →')}</button></span></div>
        <div class="grid g2" style="align-items:center;gap:2.5rem">
          <div>
            <span class="chip lv">✨ ${t('Dành cho người luyện thi IELTS')}</span>
            <h1 style="font-size:clamp(2rem,5vw,3.2rem);line-height:1.1;margin:1rem 0">${t('Từ vựng vững,')}<br><span style="background:linear-gradient(90deg,#E5502F,#FFB054);-webkit-background-clip:text;background-clip:text;color:transparent">${t('band điểm bứt phá.')}</span></h1>
            <p class="muted" style="font-size:1.1rem">${t('Học 15 phút mỗi ngày với flashcard thông minh, trò chơi, bài đọc và luyện phát âm. Mọi từ đều có phiên âm chuẩn Anh–Anh, nghĩa tiếng Việt và câu ví dụ IELTS.')}</p>
            <div class="row w-cta" style="margin-top:1.5rem"><a class="btn primary lg" href="#/welcome/setup">${t('Bắt đầu miễn phí →')}</a><button class="btn lg" id="loginW">${t('Tôi đã có tài khoản')}</button></div>
            <a class="small" href="#/placement" style="display:inline-block;margin-top:.7rem;font-weight:700">🧭 ${t('Kiểm tra trình độ trước (5 phút) →')}</a>
            <p class="small muted" style="margin-top:.8rem">${t('Miễn phí · Không quảng cáo · Dữ liệu học thuộc về bạn')}</p>
          </div>
          <div class="card" style="padding:0;overflow:hidden;box-shadow:var(--shadow-lg)">
            <div style="background:linear-gradient(135deg,#0F3D3E,#17595A 60%,#1F7A72);padding:1.6rem;color:#fff;text-align:center;position:relative">${window.Kit ? `<div class="kit-cele" style="position:absolute;right:.6rem;top:.5rem">${Kit.svg('cheer', 64)}</div>` : ''}
              <div style="font-size:4rem">🌿</div><div style="font-size:2rem;font-weight:800">sustainable</div>
              <div style="opacity:.85">/səˈsteɪnəbl/ · adj · B2</div></div>
            <div style="padding:1.2rem 1.4rem">
              <div class="vi">bền vững</div>
              <div class="example-box small" style="margin-top:.6rem">Governments must invest in <mark>sustainable</mark> energy to protect future generations.</div>
              <div class="grades" style="margin-top:1rem"><span class="btn g-again sm">${t('Quên')}</span><span class="btn g-hard sm">${t('Khó')}</span><span class="btn g-good sm">${t('Nhớ')}</span><span class="btn g-easy sm">${t('Dễ')}</span></div>
            </div>
          </div>
        </div>
        <div class="grid g3" style="margin-top:3rem">${feats.map(([em, ti, d]) => `<div class="card"><div style="font-size:2rem">${em}</div><h3 style="margin:.5rem 0 .3rem">${ti}</h3><div class="muted small">${d}</div></div>`).join('')}</div>
      </div>`;
    $('#skipW').onclick = finishOnboarding;
    $('#loginW').onclick = async () => { if (window.Sync && Sync.signIn) { await Sync.signIn(); if (state.user) finishOnboarding(); } else finishOnboarding(); };
  };

  // Thiết lập lần đầu: kỳ thi → mục tiêu theo thang điểm của kỳ thi → cường độ → chủ đề hợp kỳ thi → vào thẳng bài học đầu tiên
  function setup() {
    const TARGETS = { ielts: ['5.5', '6.0', '6.5', '7.0', '7.5', '8.0+'], ieltsgt: ['5.5', '6.0', '6.5', '7.0', '7.5', '8.0+'], toeic: ['450', '550', '650', '750', '850', '900+'], toefl: ['3.5', '4.0', '4.5', '5.0', '5.5+'], general: ['A2', 'B1', 'B2', 'C1'] };
    const DEF_T = { ielts: '7.0', ieltsgt: '6.5', toeic: '650', toefl: '4.5', general: 'B1' };
    const TOPIC_GROUPS = { ielts: ['topics', 'writing'], ieltsgt: ['topics', 'speaking'], toeic: ['toeic'], toefl: ['awl', 'topics'], general: ['core', 'topics'] };
    const EX = App.EXAMS || {};
    const pick = { exam: (App.exam && state.settings.exam) || 'ielts', target: '', pace: 20, topics: new Set() };
    const paces = [[10, '🐢 ' + t('Nhẹ nhàng'), t('5 phút/ngày · 5 từ mới')], [20, '🚶 ' + t('Đều đặn'), t('10–15 phút/ngày · 10 từ mới')], [40, '🚀 ' + t('Tăng tốc'), t('25 phút/ngày · 20 từ mới')]];
    const topicsFor = ex => TOPICS.filter(x => TOPIC_GROUPS[ex].includes(x.group)).slice(0, 15);
    const setExam = async ex => {
      pick.exam = ex; pick.target = DEF_T[ex];
      if (ex === 'toeic' && !App.loaded('tsl')) { await App.need('tsl').catch(() => {}); }
      const list = topicsFor(ex); pick.topics = new Set(list.slice(0, 3).map(x => x.id));
      draw();
    };
    const draw = () => {
      const list = topicsFor(pick.exam), words = TOPICS.filter(x => pick.topics.has(x.id)).reduce((a, x) => a + x.words.length, 0);
      const tLabel = pick.exam === 'toeic' ? t('Điểm TOEIC mục tiêu?') : pick.exam === 'toefl' ? t('Band TOEFL mục tiêu?') : pick.exam === 'general' ? t('Trình độ bạn muốn đạt?') : t('Band mục tiêu của bạn?');
      view.innerHTML = `<div style="max-width:760px;margin:0 auto" class="stack">
        <div class="row between"><span class="brand" style="padding:0"><img class="logo" src="icons/icon.svg" alt=""><span class="wordmark">lex<b>kite</b></span></span><a class="small" href="#/welcome">← ${t('Quay lại')}</a></div>
        ${window.Kit ? `<div class="kit-greet card" style="background:var(--primary-soft);border:0">${Kit.svg('happy', 58)}<div><div class="kit-say">${t('Chào bạn, mình là Kit! Vài câu hỏi nhanh để mình lên lộ trình riêng cho bạn nhé.')}</div></div></div>` : ''}
        <div class="card"><h2>🎓 ${t('Bạn đang luyện kỳ thi nào?')}</h2><div class="exam-list">${Object.entries(EX).map(([k, x]) => `<button type="button" class="exam-opt ${k === pick.exam ? 'on' : ''}" data-exam="${k}"><span class="em" aria-hidden="true">${x.ic}</span><span><b>${esc(x.name)}</b></span>${k === pick.exam ? '<span class="tick" aria-hidden="true">✓</span>' : ''}</button>`).join('')}</div></div>
        <div class="card"><h2>🎯 ${tLabel}</h2><div class="tabs" style="display:inline-flex;margin-top:.4rem" id="bandT">${TARGETS[pick.exam].map(b => `<button data-v="${b}" class="${pick.target === b ? 'on' : ''}">${b}</button>`).join('')}</div></div>
        <div class="card"><h2>⏱ ${t('Bạn muốn học với cường độ nào?')}</h2><div class="grid g3" style="margin-top:.6rem">${paces.map(([v, pt, d]) => `<button class="option ${pick.pace === v ? 'right' : ''}" data-pace="${v}" style="flex-direction:column;align-items:flex-start;gap:.2rem"><b>${pt}</b><span class="small muted">${d}</span></button>`).join('')}</div></div>
        <div class="card"><h2>📚 ${t('Chọn chủ đề muốn học trước')}</h2><p class="muted small">${t('Chọn 1–5 chủ đề, bạn có thể thêm sau trong Thư viện.')}</p>
          <div class="row" style="margin-top:.6rem">${list.map(x => `<button class="chip" data-t="${x.id}" style="border:2px solid ${pick.topics.has(x.id) ? 'var(--primary)' : 'transparent'};cursor:pointer;font-size:.9rem;padding:.4rem .8rem;${pick.topics.has(x.id) ? 'background:var(--primary-soft);color:var(--primary)' : ''}">${x.emoji} ${esc(x.name)}</button>`).join('')}</div></div>
        <button class="btn primary lg block" id="go" ${pick.topics.size ? '' : 'disabled'}>${pick.topics.size ? t('Bắt đầu học ({n} từ)', { n: words }) : t('Bắt đầu học')} →</button>
      </div>`;
      $$('[data-exam]').forEach(b => b.onclick = () => { if (b.dataset.exam !== pick.exam) setExam(b.dataset.exam); });
      $$('#bandT button').forEach(b => b.onclick = () => { pick.target = b.dataset.v; draw(); });
      $$('[data-pace]').forEach(b => b.onclick = () => { pick.pace = +b.dataset.pace; draw(); });
      $$('[data-t]').forEach(b => b.onclick = () => { const id = b.dataset.t; pick.topics.has(id) ? pick.topics.delete(id) : pick.topics.size < 5 && pick.topics.add(id); draw(); });
      $('#go').onclick = async () => {
        $('#go').disabled = true; $('#go').textContent = '⏳ ' + t('Đang chuẩn bị bộ thẻ…');
        Object.assign(state.settings, { exam: pick.exam, examTarget: pick.target, dailyGoal: pick.pace, dailyNew: pick.pace === 10 ? 5 : pick.pace === 20 ? 10 : 20 });
        if (/^ielts/.test(pick.exam)) state.settings.targetBand = pick.target;
        await saveSettings();
        for (const id of pick.topics) for (const w of topicOf(id).words) if (!inDeck(w.word)) await addWord(w, null, { silent: true });
        await finishOnboarding(true, '#/review'); // vào thẳng bài học đầu tiên (từ mới của chủ đề vừa chọn)
      };
    };
    setExam(pick.exam);
  }

  async function finishOnboarding(celebrate, to = '#/home') {
    state.settings.onboarded = true;
    await saveSettings();
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
      const w = INDEX[b.dataset.addSeed.toLowerCase()];
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
  const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
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
    await load();
    document.addEventListener('error', e => {
      const img = e.target;
      if (img.tagName === 'IMG' && img.parentElement && (img.parentElement.classList.contains('pic') || img.parentElement.classList.contains('em'))) img.parentElement.textContent = '📘';
    }, true);
    if (Store.isExtension && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(ch => { if (ch.cards) { state.cards = Object.assign(Object.create(null), ch.cards.newValue || {}); updateChrome(); } });
    }
    if (!Store.isExtension && !(window.VBNative && VBNative.is) && 'serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
    applyFreeze().catch(() => {});
    checkReminder(); setInterval(checkReminder, 60 * 1000);
    netState(); setTimeout(showInstallBtn, 1500);
    document.addEventListener('visibilitychange', async () => { if (!document.hidden) { state.cards = await Cards.all(); state.stats = await Stats.get(); state.game = await Game.get(); updateChrome(); } });
  })();
  // Các module khác (study.js, reading.js) đăng ký route rồi mới vẽ trang đầu tiên
  // Chỉ vẽ trang khi mọi module (study, grammar, pron, plan…) đã tải xong
  const boot = async () => {
    await App.ready;
    const fresh = !state.settings.onboarded && !Object.keys(state.cards).length && !state.game.xp;
    if (fresh && /^(#\/?(home)?)?$/.test(location.hash)) { location.hash = '#/welcome'; App.prefetchAll(); return; }
    route();
    App.prefetchAll();
    setTimeout(() => idle(refreshIPA), 15000);
    if (isIOS()) setTimeout(() => App.installNudge && App.installNudge(), 25000);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else setTimeout(boot, 0);
})();
