/* Lộ trình học kiểu Duolingo: các chặng theo band, mỗi bài = 1 bộ từ với vòng học Giới thiệu → Ghép thẻ → Nghe → Kiểm tra. */
(function () {
  const { $, $$, esc, modal, closeModal, ring } = UI;
  const { SRS } = Core;
  const App = window.App;
  const { state, routes } = App;
  const view = App.view;

  // Màu chặng: dẫn xuất từ bảng màu thương hiệu (docs/BRAND-RULES.md), chữ trắng đạt tương phản AA (≥ 5:1).
  // CEFR theo bảng quy đổi IELTS ↔ CEFR của Cambridge (B1 ≈ 4.0–5.0, B2 ≈ 5.5–6.5, C1 ≈ 7.0–8.0); "cando" = mục tiêu đầu ra của chặng.
  const STAGES = [
    { id: 's0', get name() { return t('Chặng 0 · Từ cốt lõi'); }, band: 'Band 4.0 – 5.0', cefr: 'A1 – B1', color: '#17595A', get desc() { return t('Những từ thông dụng nhất tiếng Anh (NGSL) – nền móng cho người mới'); },
      get cando() { return t('Hiểu và dùng các từ thông dụng nhất trong hội thoại và bài đọc hằng ngày'); }, get units() { return CORE.flatMap(subIds); } },
    { id: 's1', get name() { return t('Chặng 1 · Nền tảng'); }, band: 'Band 5.5 – 6.0', cefr: 'B1 – B2', color: '#1E7A4C', get desc() { return t('Từ vựng chủ đề quen thuộc trong Speaking Part 1–2'); },
      get cando() { return t('Nói và viết về chủ đề quen thuộc: học tập, công việc, sức khỏe, du lịch'); }, units: ['education', 'work', 'health', 'travel', 'society', 'technology', 'food', 'sport'] },
    { id: 's2', get name() { return t('Chặng 2 · Mở rộng chủ đề'); }, band: 'Band 6.5', cefr: 'B2', color: '#B7472A', get desc() { return t('Chủ đề Writing Task 2 hay gặp và từ mô tả biểu đồ'); },
      get cando() { return t('Bàn luận vấn đề xã hội và mô tả số liệu, biểu đồ bằng từ chính xác'); }, units: ['environment', 'media', 'urban', 'crime', 'culture', 'consumerism', 'task1', 'describe'] },
    { id: 's3', get name() { return t('Chặng 3 · Học thuật'); }, band: 'Band 7.0', cefr: 'C1', color: '#9A5B00', get desc() { return t('Từ học thuật AWL, từ nối, cách nêu quan điểm'); },
      get cando() { return t('Viết và nói theo phong cách học thuật: nêu quan điểm, nối ý mạch lạc'); }, units: ['awl1', 'awl2', 'linking', 'awl3', 'opinion', 'awl4', 'awl5', 'task2', 'phrasal'] },
    { id: 's4', get name() { return t('Chặng 4 · Tinh hoa'); }, band: 'Band 7.5+', cefr: 'C1 – C2', color: '#A8324F', get desc() { return t('Collocation, thành ngữ và từ học thuật nâng cao'); },
      get cando() { return t('Diễn đạt tự nhiên và chính xác với collocation, thành ngữ'); }, units: ['collocations', 'idioms', 'awl6', 'science', 'awl7', 'government', 'economy', 'awl8', 'energy', 'awl9', 'wildlife', 'awl10', 'architecture', 'space', 'language'] },
  ];
  // Chặng 0: 5 bộ NGSL × 281 từ chia thành bài con ~19 từ (id "ngsl1.3") – thắng sớm như các chặng sau (12–60 từ/bài).
  // Bài cũ (unitDone/pathSteps của "ngsl1") vẫn được tính cho mọi bài con → không mất tiến độ, không cần ghi lại dữ liệu.
  const CORE = ['ngsl1', 'ngsl2', 'ngsl3', 'ngsl4', 'ngsl5'], PART = 20, SUB = {};
  const parts = tp => Math.ceil(tp.words.length / PART);
  const subIds = p => { const tp = App.topicOf(p); return tp ? Array.from({ length: parts(tp) }, (_, k) => p + '.' + (k + 1)) : []; };
  const parentOf = id => String(id).split(/[.~]/)[0];
  // Mỗi Ngày học 6–8 từ mới (người mới ít từ hơn): chặng 0 → 7, chặng sau → 8 (cố định → id ngày không đổi giữa các phiên bản)
  const DAY_SIZE = { s0: 7 }, dayParts = (tp, st) => Math.max(1, Math.round(tp.words.length / (DAY_SIZE[st] || 8)));
  App.dayParts = dayParts;
  // Số ngày của 1 bộ từ – cố định theo bộ (không theo gói học) → id ngày "bộ~N" giống nhau ở mọi gói (tracks.js)
  App.dayN = id => { const tp = App.topicOf(id), st = STAGES.find(s => s.units.includes(id)); return tp ? dayParts(tp, st && st.id) : 0; };
  App.subTopic = id => {
    const dm = /^(.+)~(\d+)$/.exec(id || '');
    if (dm) { if (SUB[id]) return SUB[id]; const tp = App.topicOf(dm[1]); if (!tp) return;
      const n = App.dayN(dm[1]), k = +dm[2] - 1; if (k < 0 || k >= n) return;
      const words = tp.words.slice(Math.round(k * tp.words.length / n), Math.round((k + 1) * tp.words.length / n));
      return (SUB[id] = { id, emoji: tp.emoji, group: tp.group, parent: dm[1], day: k + 1, days: n, words, get name() { return tp.name + ' · ' + (k + 1) + '/' + n; }, get desc() { return words.slice(0, 4).map(w => w.word).join(' · ') + ' …'; } }); }
    const m = /^(ngsl[1-5])\.(\d+)$/.exec(id || ''), tp = m && App.topicOf(m[1]);
    if (!tp || SUB[id]) return SUB[id];
    const n = parts(tp), k = +m[2] - 1; if (k < 0 || k >= n) return;
    const a = Math.round(k * tp.words.length / n), b = Math.round((k + 1) * tp.words.length / n);
    const base = CORE.slice(0, CORE.indexOf(m[1])).reduce((s, p) => s + ((App.topicOf(p) || {}).words || []).length, 0);
    const words = tp.words.slice(a, b);
    return (SUB[id] = { id, emoji: tp.emoji, group: tp.group, parent: m[1], words, get name() { return t('Từ cốt lõi {a}–{b}', { a: base + a + 1, b: base + b }); }, get desc() { return words.slice(0, 4).map(w => w.word).join(' · ') + ' …'; } });
  };
  const STEPS = () => [
    ['learn', '🧠', t('Học từ mới'), t('Giới thiệu từ → trắc nghiệm → tự gõ lại')],
    ['match', '⚡', t('Ghép thẻ'), t('Củng cố nhanh nghĩa – từ')],
    ['listen', '🎧', t('Nghe & chép'), t('Nhận diện âm và chính tả')],
    ['test', '🏁', t('Kiểm tra bài'), t('Đạt ≥ 80% để mở bài tiếp theo')],
  ];

  const unitsFlat = () => STAGES.flatMap(s => s.units.map(u => ({ stage: s, topic: App.topicOf(u) })).filter(x => x.topic));
  const doneMap = () => { const d = state.game.unitDone || {}; return new Proxy(d, { get: (o, k) => o[k] || o[parentOf(k)] }); };
  function learnedPct(t) {
    const n = t.words.filter(w => { const c = state.cards[w.word.toLowerCase()]; return c && c.srs.last; }).length;
    return n / t.words.length;
  }
  function unitState(S, stg) { // S/stg: chặng + chặng bắt đầu của gói học khác (tracks.js); mặc định lộ trình IELTS gốc
    const list = S ? S.flatMap(s => s.units.map(u => ({ stage: s, topic: App.topicOf(u) })).filter(x => x.topic)) : unitsFlat();
    const done = doneMap();
    // Kiểm tra đầu vào gợi ý chặng bắt đầu → các bài trước chặng đó mở sẵn (không bắt học lại), bài hiện tại = bài đầu của chặng gợi ý
    const pl = state.settings && state.settings.placement, ps = stg !== undefined ? stg : pl && pl.stage, start = Math.max(0, ps ? list.findIndex(u => u.stage.id === ps) : 0);
    const out = list.map((u, i) => {
      const isDone = !!done[u.topic.id], pct = learnedPct(u.topic);
      // Mở khóa nếu bài trước đã xong, đã học ≥ 80% từ của bài này, hoặc nằm trước/đầu chặng gợi ý
      const unlocked = isDone || i <= start || !!done[list[i - 1].topic.id] || pct >= 0.8;
      return { ...u, i, status: isDone ? 'done' : unlocked ? 'open' : 'locked', pct, score: done[u.topic.id] };
    });
    const cur = out.find(u => u.status === 'open' && u.i >= start) || out.find(u => u.status === 'open');
    if (cur) cur.status = 'current';
    return out;
  }
  App.pathCurrent = () => unitState().find(u => u.status === 'current');

  // Bước Ghép thẻ/Nghe ghi khi HOÀN THÀNH lượt (study.js → 'lexkite:practice-done' → path-reward.js), bản ghi cũ giữ nguyên.
  let REC = null;
  const recLoad = () => REC ? Promise.resolve(REC) : Core.Store.get('pathSteps', {}).then(v => (REC = v || {})).catch(() => (REC = {}));
  const recOf = id => [...((REC || {})[id] || []), ...((REC || {})[parentOf(id)] || [])];
  window.addEventListener('lexkite:practice-done', e => { const d = e.detail || {}, m = /^topic:(.+)$/.exec(d.src || '');
    if ((m && m[1].includes('~')) || sess()) return App.need('pathx').then(() => DayPath.done(d)).catch(() => {}); // buổi học theo Ngày
    if (m && STAGES.some(s => s.units.includes(m[1]))) App.need('pathx').then(() => PathReward.done(d, m[1], { recLoad, recOf, unitState, STEPS, stepDone, stepHref, nextStep })).catch(() => {}); });
  const stepDone = (u, m) => m === 'learn' ? u.pct >= 0.8 : m === 'test' ? u.status === 'done' : recOf(u.topic.id).includes(m);
  const stepHref = (id, m) => `#/practice/${m}?src=${encodeURIComponent('topic:' + id)}${m === 'test' ? `&unit=${id}` : ''}`;
  // Bước kế tiếp của bài hiện tại: học từ mới (mỗi lượt 8 từ) tới khi thuộc ≥ 80% → kiểm tra bài để mở bài sau
  const nextStep = u => (u.pct < 0.8 ? 'learn' : 'test');
  App.pathNext = async () => { await recLoad(); const u = App.pathCurrent(); return u && { unit: u, step: nextStep(u), href: stepHref(u.topic.id, nextStep(u)) }; };

  // Bản đồ lộ trình theo NGÀY (Ngày 1, 2, 3…) + trang buổi học #/day/N: path-day.js (tải lười, gói 'pathx' – khung app không phình)
  App.PathAPI = { STAGES, unitState, learnedPct, recLoad, recOf, STEPS, stepDone, stepHref, nextStep };
  const lazy = n => async (...a) => { await App.lazy('pathx'); return window.DayPath[n](...a); };
  routes.path = lazy('map'); routes.day = lazy('page'); routes.tracks = lazy('tracks'); // 🧭 Gói học (tracks.js)
  // Thanh tiến độ buổi học (Ngày N · 3/6) trên các trang bài tập khi đang học dở 1 ngày
  const sess = () => { try { return localStorage.getItem('vb.daySess'); } catch (e) { return null; } };
  App.afterRoute = name => { if (sess() && !/^(day|path|home|welcome|tracks)$/.test(name || 'home')) App.need('pathx').then(() => window.DayPath && DayPath.bar(name)).catch(() => {}); };

  // Ghi nhận hoàn thành bài (gọi từ bài kiểm tra)
  App.completeUnit = async (id, pct) => {
    let prev = 0;
    state.game = await Game.mutate(g => {
      prev = (g.unitDone || {})[id] || 0;
      if (pct >= 80 || prev) g.unitDone = { ...(g.unitDone || {}), [id]: Math.max(prev, pct) };
    });
    if (pct < 80 && !prev) return false;
    if (!prev && pct >= 80) {
      // Thêm từ của bài vào flashcard để hệ thống nhắc ôn đúng thời điểm vàng
      const t = App.topicOf(id);
      if (t) for (const w of t.words) if (!App.inDeck(w.word)) await App.addWord(w, null, { silent: true });
      return true;
    }
    return false;
  };
})();
