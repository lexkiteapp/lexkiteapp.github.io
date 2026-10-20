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
      get cando() { return t('Hiểu và dùng các từ thông dụng nhất trong hội thoại và bài đọc hằng ngày'); }, units: ['ngsl1', 'ngsl2', 'ngsl3', 'ngsl4', 'ngsl5'] },
    { id: 's1', get name() { return t('Chặng 1 · Nền tảng'); }, band: 'Band 5.5 – 6.0', cefr: 'B1 – B2', color: '#1E7A4C', get desc() { return t('Từ vựng chủ đề quen thuộc trong Speaking Part 1–2'); },
      get cando() { return t('Nói và viết về chủ đề quen thuộc: học tập, công việc, sức khỏe, du lịch'); }, units: ['education', 'work', 'health', 'travel', 'society', 'technology', 'food', 'sport'] },
    { id: 's2', get name() { return t('Chặng 2 · Mở rộng chủ đề'); }, band: 'Band 6.5', cefr: 'B2', color: '#B7472A', get desc() { return t('Chủ đề Writing Task 2 hay gặp và từ mô tả biểu đồ'); },
      get cando() { return t('Bàn luận vấn đề xã hội và mô tả số liệu, biểu đồ bằng từ chính xác'); }, units: ['environment', 'media', 'urban', 'crime', 'culture', 'consumerism', 'task1', 'describe'] },
    { id: 's3', get name() { return t('Chặng 3 · Học thuật'); }, band: 'Band 7.0', cefr: 'C1', color: '#9A5B00', get desc() { return t('Từ học thuật AWL, từ nối, cách nêu quan điểm'); },
      get cando() { return t('Viết và nói theo phong cách học thuật: nêu quan điểm, nối ý mạch lạc'); }, units: ['awl1', 'awl2', 'linking', 'awl3', 'opinion', 'awl4', 'awl5', 'task2', 'phrasal'] },
    { id: 's4', get name() { return t('Chặng 4 · Tinh hoa'); }, band: 'Band 7.5+', cefr: 'C1 – C2', color: '#A8324F', get desc() { return t('Collocation, thành ngữ và từ học thuật nâng cao'); },
      get cando() { return t('Diễn đạt tự nhiên và chính xác với collocation, thành ngữ'); }, units: ['collocations', 'idioms', 'awl6', 'science', 'awl7', 'government', 'economy', 'awl8', 'energy', 'awl9', 'wildlife', 'awl10', 'architecture', 'space', 'language'] },
  ];
  const STEPS = () => [
    ['learn', '🧠', t('Học từ mới'), t('Giới thiệu từ → trắc nghiệm → tự gõ lại')],
    ['match', '⚡', t('Ghép thẻ'), t('Củng cố nhanh nghĩa – từ')],
    ['listen', '🎧', t('Nghe & chép'), t('Nhận diện âm và chính tả')],
    ['test', '🏁', t('Kiểm tra bài'), t('Đạt ≥ 80% để mở bài tiếp theo')],
  ];

  const unitsFlat = () => STAGES.flatMap(s => s.units.map(u => ({ stage: s, topic: App.topicOf(u) })).filter(x => x.topic));
  const doneMap = () => (state.game.unitDone || {});
  function learnedPct(t) {
    const n = t.words.filter(w => { const c = state.cards[w.word.toLowerCase()]; return c && c.srs.last; }).length;
    return n / t.words.length;
  }
  function unitState() {
    const list = unitsFlat();
    const done = doneMap();
    // Kiểm tra đầu vào gợi ý chặng bắt đầu → các bài trước chặng đó mở sẵn (không bắt học lại), bài hiện tại = bài đầu của chặng gợi ý
    const pl = state.settings && state.settings.placement, start = Math.max(0, pl && pl.stage ? list.findIndex(u => u.stage.id === pl.stage) : 0);
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

  // Bước đã làm trong từng bài (Ghép thẻ, Nghe & chép) – ghi khi mở bước đó từ bất kỳ đâu (#/practice/<bước>?src=topic:<bài>).
  // "Học từ mới" xong khi đã học ≥ 80% số từ; "Kiểm tra bài" xong khi đạt ≥ 80% (unitDone).
  let REC = null;
  const recLoad = () => REC ? Promise.resolve(REC) : Core.Store.get('pathSteps', {}).then(v => (REC = v || {})).catch(() => (REC = {}));
  window.addEventListener('hashchange', () => {
    const m = /^#\/practice\/(match|listen)\?(?:.*&)?src=topic(?::|%3A)([\w-]+)/.exec(location.hash);
    if (!m || !STAGES.some(s => s.units.includes(m[2]))) return;
    recLoad().then(r => { const a = r[m[2]] || []; if (a.includes(m[1])) return; r[m[2]] = [...a, m[1]]; return Core.Store.set('pathSteps', r); }).catch(() => {});
  });
  const stepDone = (u, m) => m === 'learn' ? u.pct >= 0.8 : m === 'test' ? u.status === 'done' : ((REC || {})[u.topic.id] || []).includes(m);
  const stepHref = (id, m) => `#/practice/${m}?src=${encodeURIComponent('topic:' + id)}${m === 'test' ? `&unit=${id}` : ''}`;
  // Bước kế tiếp của bài hiện tại: học từ mới (mỗi lượt 8 từ) tới khi thuộc ≥ 80% → kiểm tra bài để mở bài sau
  const nextStep = u => (u.pct < 0.8 ? 'learn' : 'test');
  App.pathNext = async () => { await recLoad(); const u = App.pathCurrent(); return u && { unit: u, step: nextStep(u), href: stepHref(u.topic.id, nextStep(u)) }; };

  routes.path = async function () {
    await recLoad();
    const us = unitState();
    const doneN = us.filter(u => u.status === 'done').length;
    const ielts = /^ielts/.test(App.exam ? App.exam() : 'ielts');
    const cur = us.find(u => u.status === 'current'), stName = m => (STEPS().find(x => x[0] === m) || [])[2];
    let idx = 0;
    view.innerHTML = `
      <div class="page-head"><div><h1>${ielts ? t('Lộ trình chinh phục IELTS') : t('Lộ trình từ vựng')}</h1><p class="muted">${t('{done}/{total} bài hoàn thành · Học theo vòng: giới thiệu → luyện → nghe → kiểm tra, rồi ôn lại đúng thời điểm vàng.', { done: doneN, total: us.length })}</p></div>
        <div class="row">${ring(doneN / us.length * 100, `${Math.round(doneN / us.length * 100)}%`, 'var(--good)')}</div></div>
      ${cur ? `<a class="btn primary lg block path-cta" href="${stepHref(cur.topic.id, nextStep(cur))}">${cur.topic.emoji} ${t('Tiếp tục: {step}', { step: esc(cur.topic.name + ' · ' + stName(nextStep(cur))) })} →</a>` : ''}
      <div class="path">
        ${STAGES.map(st => {
          const su = us.filter(u => u.stage.id === st.id);
          const sd = su.filter(u => u.status === 'done').length;
          return `<div class="stage-banner" style="--sc:${st.color}">
              <div><div class="tiny stage-lv">${ielts ? `${st.cefr} · ${st.band}` : `CEFR ${st.cefr}`}</div><h2 style="margin:.1rem 0;color:#fff">${st.name}</h2><div class="small" style="opacity:.92">${st.desc}</div><div class="small stage-cando">🎯 ${st.cando}</div></div>
              <div class="stage-count">${sd}/${su.length}</div></div>
            <div class="nodes">${su.map(u => {
              const off = Math.round(Math.sin(idx++ * 0.9) * 90);
              const p = Math.round(u.pct * 100);
              const stt = u.status === 'locked' ? t('Bài này đang khóa') : u.status === 'done' ? t('Đã hoàn thành') : u.status === 'current' ? t('Tiếp theo') : t('đã học {pct}%', { pct: p });
              return `<div class="node-wrap${u.status === 'current' ? ' cur' : ''}" style="transform:translateX(${off}px)">
                ${u.status === 'current' ? `<div class="node-tip" aria-hidden="true">${t('BẮT ĐẦU')}</div>` : ''}
                <button class="node ${u.status}" data-unit="${u.topic.id}" style="--sc:${st.color};--p:${p}" aria-label="${esc(u.topic.name + ' – ' + stt)}"${u.status === 'current' ? ' aria-current="step"' : ''}>
                  <span aria-hidden="true">${u.status === 'locked' ? '🔒' : u.status === 'done' ? '⭐' : u.topic.emoji}</span></button>
                <div class="node-label" aria-hidden="true">${esc(u.topic.name)}</div>
              </div>`;
            }).join('')}</div>`;
        }).join('')}
      </div>`;
    $$('[data-unit]').forEach(b => b.onclick = () => openUnit(b.dataset.unit));
    const cn = $('.node.current');
    if (cn && !location.hash.includes('?')) setTimeout(() => cn.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' }), 150);
  };

  function openUnit(id) {
    const u = unitState().find(x => x.topic.id === id);
    if (!u) return;
    if (u.status === 'locked') {
      modal(`<div class="celebrate"><div class="em">🔒</div><h2>${t('Bài này đang khóa')}</h2><p class="muted">${t('Hoàn thành bài trước (kiểm tra đạt ≥ 80%) hoặc học ≥ 80% số từ của bài này để mở khóa.')}</p>
        <div class="row center"><a class="btn" href="#/topic/${id}" data-close>${t('Xem trước bộ từ')}</a><button class="btn primary" data-close>${t('Đã hiểu')}</button></div></div>`);
      return;
    }
    const tp = u.topic, nx = u.status === 'done' ? '' : nextStep(u), nxName = nx && (STEPS().find(x => x[0] === nx) || [])[2];
    modal(`<div class="row nowrap" style="gap:1rem"><div aria-hidden="true" style="font-size:2.6rem;width:70px;height:70px;border-radius:20px;display:grid;place-items:center;background:var(--surface-2)">${tp.emoji}</div>
        <div><div class="tiny muted" style="font-weight:700">${esc(u.stage.name)}</div><h2 style="margin:0">${esc(tp.name)}</h2><div class="small muted">${t('{n} từ · đã học {pct}%', { n: tp.words.length, pct: Math.round(u.pct * 100) })}${u.score ? ' · ' + t('điểm kiểm tra {score}%', { score: u.score }) : ''}</div></div></div>
      <p class="small unit-goal">🎯 ${t('Mục tiêu: nhận ra, hiểu và dùng được {n} từ về “{name}”.', { n: tp.words.length, name: esc(tp.name) })}</p>
      <div class="stack unit-steps">
        ${STEPS().map(([m, em, name, d], i) => { const ok = stepDone(u, m), isNx = m === nx; return `<a class="card hover row nowrap unit-step${isNx ? ' next' : ''}" href="${stepHref(id, m)}" data-close>
          <span class="us-em" aria-hidden="true">${ok ? '✅' : em}</span>
          <div class="grow"><b>${i + 1}. ${name}</b><div class="small muted">${d}</div></div>${isNx ? `<span class="chip lv">${t('Tiếp theo')}</span>` : ok ? `<span class="sr-only">${t('Đã hoàn thành')}</span>` : '<span class="muted" aria-hidden="true">→</span>'}</a>`; }).join('')}
      </div>
      ${nx ? `<a class="btn primary lg block" href="${stepHref(id, nx)}" data-close style="margin-top:1rem">${t('Bắt đầu: {step}', { step: esc(nxName) })} →</a>` : ''}
      <div class="row between" style="margin-top:1rem"><a class="btn sm ghost" href="#/topic/${id}" data-close>📚 ${t('Xem danh sách từ')}</a><button class="btn sm" data-close>${t('Đóng')}</button></div>`);
  }

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
